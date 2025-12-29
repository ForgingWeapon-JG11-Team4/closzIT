from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException
from model_manager import ModelManager
import utils
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작 시 실행: 모델 로드
    logger.info("서버 시작: 모델 로딩을 초기화합니다.")
    manager = ModelManager()
    manager.load_models()
    yield
    # 종료 시 실행 (필요한 경우 리소스 정리)
    logger.info("서버 종료: 리소스를 정리합니다.")

app = FastAPI(lifespan=lifespan)

@app.get("/")
def read_root():
    return {"message": "AI FastAPI 서버가 실행 중입니다."}

@app.get("/status")
def get_status():
    manager = ModelManager()
    # 로드된 모델 목록 확인
    loaded_models = list(manager.models.keys())
    return {"device": manager.device, "loaded_models": loaded_models}

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    """
    이미지를 업로드받아 의류 객체를 탐지하고 세그멘테이션 결과를 반환합니다.
    """
    try:
        # 1. 이미지 읽기 및 디코딩
        contents = await file.read()
        image = utils.decode_image(contents)
        if image is None:
            raise HTTPException(status_code=400, detail="유효하지 않은 이미지 파일입니다.")

        manager = ModelManager()

        # 2. YOLO 객체 탐지
        detections = manager.predict_yolo(image)
        if not detections:
            return [] # 탐지된 객체 없음

        # 3. 바운딩 박스 추출
        boxes = [d['box'] for d in detections]

        # 4. SAM2 세그멘테이션
        masks = manager.predict_sam2(image, boxes)
        
        results = []
        for i, detection in enumerate(detections):
            label = detection['label']
            confidence = detection['confidence']
            box = detection['box']
            
            # 마스크가 있으면 적용, 없으면 원본 이미지에서 박스만 크롭 (또는 투명 처리 불가)
            # SAM2 로딩 실패 시 masks는 None일 수 있음
            if masks and len(masks) > i:
                mask = masks[i]
                processed_image = utils.apply_mask_and_crop(image, mask, box)
            else:
                # 마스크가 없는 경우 (SAM2 미로드 등), 박스 영역만 단순 크롭 (배경 투명화 X)
                # 여기서는 마스크가 없으면 투명 처리가 안 되므로, 
                # 단순히 박스 영역만 잘라서 보낼 수도 있고, 에러를 낼 수도 있음.
                # 요구사항: "배경을 투명하게 처리한 의류 조각 이미지"
                # SAM2가 없으면 이 요구사항을 충족 못하므로 경고 로그 남기고 박스 크롭만 반환 시도
                x1, y1, x2, y2 = map(int, box)
                processed_image = image[y1:y2, x1:x2]
                logger.warning(f"마스크 생성 실패로 인해 단순 크롭 이미지를 반환합니다: {label}")

            # Base64 인코딩
            image_base64 = utils.encode_image_to_base64(processed_image)
            
            results.append({
                "label": label,
                "confidence": confidence,
                "box": box.tolist(), # JSON 직렬화를 위해 리스트 변환
                "image_base64": image_base64
            })
            
        return results

@app.post("/analyze-all")
async def analyze_all_images(file: UploadFile = File(...)):
    """
    이미지를 받아 YOLO 탐지 -> SAM2 세그멘테이션 -> FashionSigLIP 임베딩 추출을 수행하고
    각 객체별 이미지 조각(Base64)과 임베딩 벡터를 반환합니다.
    """
    try:
        # 1. 이미지 읽기 및 디코딩
        contents = await file.read()
        image = utils.decode_image(contents)
        if image is None:
            raise HTTPException(status_code=400, detail="유효하지 않은 이미지 파일입니다.")

        manager = ModelManager()

        # 2. YOLO 객체 탐지
        detections = manager.predict_yolo(image)
        if not detections:
            return [] # 탐지된 객체 없음

        # 3. 바운딩 박스 추출
        boxes = [d['box'] for d in detections]

        # 4. SAM2 세그멘테이션
        masks = manager.predict_sam2(image, boxes)
        
        results = []
        for i, detection in enumerate(detections):
            label = detection['label']
            confidence = detection['confidence']
            box = detection['box']
            
            # 마스크 처리 및 크롭
            if masks and len(masks) > i:
                mask = masks[i]
                processed_image = utils.apply_mask_and_crop(image, mask, box)
            else:
                x1, y1, x2, y2 = map(int, box)
                processed_image = image[y1:y2, x1:x2]
                logger.warning(f"마스크 생성 실패, 단순 크롭 사용: {label}")

            # 5. Base64 인코딩
            image_base64 = utils.encode_image_to_base64(processed_image)

            # 6. FashionSigLIP 임베딩 추출
            embedding = manager.extract_embedding(processed_image)
            
            results.append({
                "label": label,
                "confidence": confidence,
                "box": box.tolist(),
                "image_base64": image_base64,
                "embedding": embedding
            })
            
        return results

    except Exception as e:
        logger.error(f"통합 분석 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail=str(e))

