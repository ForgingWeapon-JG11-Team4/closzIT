from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException
from model_manager import ModelManager
import utils
import logging
import os
import numpy as np

# 환경 변수 설정
USE_SAM2 = os.getenv("USE_SAM2", "true").lower() == "true"

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info(f"SAM2 사용 설정: {'활성화' if USE_SAM2 else '비활성화 (단순 크롭)'}")


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
            raise HTTPException(
                status_code=400, detail="유효하지 않은 이미지 파일입니다."
            )

        manager = ModelManager()

        # 2. YOLO 객체 탐지
        detections = manager.predict_yolo(image)
        if not detections:
            return []  # 탐지된 객체 없음

        # 3. 바운딩 박스 추출
        boxes = [d["box"] for d in detections]

        # 4. SAM2 세그멘테이션
        masks = manager.predict_sam2(image, boxes)

        results = []
        for i, detection in enumerate(detections):
            label = detection["label"]
            confidence = detection["confidence"]
            box = detection["box"]

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
                logger.warning(
                    f"마스크 생성 실패로 인해 단순 크롭 이미지를 반환합니다: {label}"
                )

            # Base64 인코딩
            image_base64 = utils.encode_image_to_base64(processed_image)

            results.append(
                {
                    "label": label,
                    "confidence": confidence,
                    "box": box.tolist(),  # JSON 직렬화를 위해 리스트 변환
                    "image_base64": image_base64,
                }
            )

        return results

    except Exception as e:
        logger.error(f"분석 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze-all")
async def analyze_all_images(file: UploadFile = File(...)):
    """
    이미지를 받아 YOLO 탐지 -> SAM2 세그멘테이션 -> FashionSigLIP 임베딩 추출을 수행하고
    각 객체별 이미지 조각(Base64)과 임베딩 벡터를 반환합니다.
    """
    import time

    total_start = time.time()

    try:
        # 1. 이미지 읽기 및 디코딩
        decode_start = time.time()
        contents = await file.read()
        image = utils.decode_image(contents)
        if image is None:
            raise HTTPException(
                status_code=400, detail="유효하지 않은 이미지 파일입니다."
            )
        logger.info(f"[TIMING] Image decode: {(time.time() - decode_start)*1000:.1f}ms")

        manager = ModelManager()

        # 2. YOLO 객체 탐지
        yolo_start = time.time()
        detections = manager.predict_yolo(image)
        logger.info(
            f"[TIMING] YOLO detection: {(time.time() - yolo_start)*1000:.1f}ms, found {len(detections)} items"
        )

        # YOLO 탐지 결과 상세 로그
        logger.info("=" * 50)
        logger.info("[YOLO DETECTION RESULTS]")
        for i, det in enumerate(detections):
            label = det.get("label", "unknown")
            conf = det.get("confidence", 0) * 100
            box = det.get("box", [])
            logger.info(
                f"  [{i}] Label: {label:10} | Confidence: {conf:5.1f}% | Box: {box}"
            )
        logger.info("=" * 50)

        # ============================================================
        # YOLO Fallback: CLIP으로 신발/의류 감지 → SAM2 중앙점 프롬프트
        # ============================================================
        if not detections:
            logger.warning(
                "[YOLO FALLBACK] 탐지된 객체 없음 - CLIP으로 아이템 타입 확인"
            )

            # 1. CLIP으로 신발/의류 여부 확인
            clip_result = manager.detect_item_type_with_clip(image)
            item_type = clip_result["item_type"]

            if item_type == "unknown":
                logger.warning(
                    "[YOLO FALLBACK] CLIP도 패션 아이템으로 인식하지 못함 - 빈 결과 반환"
                )
                return []

            logger.info(
                f"[YOLO FALLBACK] CLIP 감지: {item_type} (confidence: {clip_result['confidence']:.2%})"
            )

            h, w = image.shape[:2]
            # 신발 한 쌍을 위해 3개 포인트 사용 (왼쪽, 중앙, 오른쪽)
            points = [
                [w // 4, h // 2],  # 왼쪽 1/4 지점
                [w // 2, h // 2],  # 중앙
                [3 * w // 4, h // 2],  # 오른쪽 3/4 지점
            ]
            full_box = np.array([0, 0, w, h])

            # 2. SAM2로 여러 포인트 기준 세그멘테이션
            # CLIP fallback의 경우 원본 이미지가 YOLO 크롭 역할
            yolo_image_base64 = utils.encode_image_to_base64(image)
            sam2_image_base64 = None
            processed_image = image

            if USE_SAM2:
                try:
                    sam_start = time.time()
                    # 여러 포인트 프롬프트로 SAM2 호출 (신발 한 쌍 모두 마스킹)
                    mask = manager.predict_sam2_with_points(image, points)
                    logger.info(
                        f"[TIMING] SAM2 multi-point segmentation: {(time.time() - sam_start)*1000:.1f}ms"
                    )

                    if mask is not None:
                        processed_image = utils.apply_mask_and_crop(
                            image, mask, full_box
                        )
                        sam2_image_base64 = utils.encode_image_to_base64(processed_image)
                        logger.info("[YOLO FALLBACK] SAM2 마스크 적용 성공 (3-points)")
                    else:
                        logger.warning(
                            "[YOLO FALLBACK] SAM2 마스크 생성 실패, 원본 이미지 사용"
                        )
                except Exception as e:
                    logger.error(f"[YOLO FALLBACK] SAM2 실패: {e}")

            # 3. Base64 인코딩 (SAM2 우선, 없으면 YOLO)
            image_base64 = sam2_image_base64 if sam2_image_base64 else yolo_image_base64

            # 4. FashionSigLIP 임베딩 추출
            embed_start = time.time()
            embedding = manager.extract_embedding(processed_image)
            logger.info(
                f"[TIMING] Embedding (fallback): {(time.time() - embed_start)*1000:.1f}ms"
            )

            # 5. CLIP 감지 결과를 label로 전달 (Bedrock 힌트용)
            result = [
                {
                    "label": item_type,  # 'shoes' 또는 'clothing' - Bedrock 힌트
                    "confidence": clip_result["confidence"],
                    "box": full_box.tolist(),
                    "yolo_image_base64": yolo_image_base64,      # 원본 이미지 (YOLO 역할)
                    "sam2_image_base64": sam2_image_base64,      # SAM2 배경 제거 (없으면 None)
                    "image_base64": image_base64,                # 기존 호환용
                    "embedding": embedding,
                }
            ]

            logger.info(
                f"[TIMING] Total FastAPI processing (CLIP fallback): {(time.time() - total_start)*1000:.1f}ms"
            )
            return result

        # 3. 바운딩 박스 추출
        boxes = [d["box"] for d in detections]

        # 4. SAM2 세그멘테이션 (USE_SAM2=true일 때만 실행)
        masks = None
        if USE_SAM2:
            sam_start = time.time()
            masks = manager.predict_sam2(image, boxes)
            logger.info(
                f"[TIMING] SAM2 segmentation: {(time.time() - sam_start)*1000:.1f}ms"
            )
        else:
            logger.info("[TIMING] SAM2 비활성화 - 단순 크롭 사용")

        results = []
        for i, detection in enumerate(detections):
            item_start = time.time()
            label = detection["label"]
            confidence = detection["confidence"]
            box = detection["box"]

            # YOLO 바운딩박스 크롭 이미지 (항상 생성)
            x1, y1, x2, y2 = map(int, box)
            yolo_cropped_image = image[y1:y2, x1:x2]
            yolo_image_base64 = utils.encode_image_to_base64(yolo_cropped_image)

            # SAM2 마스킹 이미지 (마스크가 있을 때만 생성)
            sam2_image_base64 = None
            if USE_SAM2 and masks and len(masks) > i:
                mask = masks[i]
                sam2_masked_image = utils.apply_mask_and_crop(image, mask, box)
                sam2_image_base64 = utils.encode_image_to_base64(sam2_masked_image)
                processed_image = sam2_masked_image  # 임베딩용
            else:
                processed_image = yolo_cropped_image  # 임베딩용
                logger.warning(f"마스크 생성 실패, 단순 크롭 사용: {label}")

            # 5. Base64 인코딩 (기존 호환용 - SAM2 우선, 없으면 YOLO)
            encode_start = time.time()
            image_base64 = sam2_image_base64 if sam2_image_base64 else yolo_image_base64
            logger.info(
                f"[TIMING] Item {i} base64 encode: {(time.time() - encode_start)*1000:.1f}ms, size={len(image_base64)} chars"
            )

            # 6. FashionSigLIP 임베딩 추출
            embed_start = time.time()
            embedding = manager.extract_embedding(processed_image)
            logger.info(
                f"[TIMING] Item {i} embedding: {(time.time() - embed_start)*1000:.1f}ms"
            )

            logger.info(
                f"[TIMING] Item {i} total: {(time.time() - item_start)*1000:.1f}ms"
            )

            results.append(
                {
                    "label": label,
                    "confidence": confidence,
                    "box": box.tolist(),
                    "yolo_image_base64": yolo_image_base64,      # YOLO 바운딩박스 크롭
                    "sam2_image_base64": sam2_image_base64,      # SAM2 배경 제거 (없으면 None)
                    "image_base64": image_base64,                # 기존 호환용
                    "embedding": embedding,
                }
            )

        logger.info(
            f"[TIMING] Total FastAPI processing: {(time.time() - total_start)*1000:.1f}ms"
        )
        return results

    except Exception as e:
        logger.error(f"통합 분석 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail=str(e))


from pydantic import BaseModel
from typing import List


class TextEmbeddingRequest(BaseModel):
    texts: List[str]


@app.post("/embed-text")
async def embed_text(request: TextEmbeddingRequest):
    """
    텍스트 리스트를 받아 각각의 임베딩 벡터를 반환합니다.
    Request body: {"texts": ["White Solid Casual", "Black Stripe Formal"]}
    Response: {"embeddings": [[0.1, 0.2, ...], [0.3, 0.4, ...]]}
    """
    try:
        manager = ModelManager()
        embeddings = []

        for text in request.texts:
            embedding = manager.extract_text_embedding(text)
            embeddings.append(embedding)

        return {"embeddings": embeddings}

    except Exception as e:
        logger.error(f"텍스트 임베딩 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# IDM-VTON 전처리 엔드포인트 (향후 실제 모델 통합 예정)
# =============================================================================


class HumanPreprocessRequest(BaseModel):
    image_base64: str


class GarmentPreprocessRequest(BaseModel):
    image_base64: str


class TextPreprocessRequest(BaseModel):
    garment_description: str


class VtonGenerateRequest(BaseModel):
    user_id: str
    clothing_id: str
    denoise_steps: int = 10
    seed: int = 42


@app.post("/vton/preprocess-human")
async def preprocess_human(request: HumanPreprocessRequest):
    """
    사람 이미지 전처리: OpenPose + Parsing + DensePose
    TODO: 실제 IDM-VTON 모델 통합 필요
    """
    logger.warning("[VTON] preprocess-human called - Mock implementation")
    # Mock response - 실제 구현 시 OpenPose, Parsing, DensePose 실행
    return {
        "human_img": request.image_base64,  # Mock: 원본 그대로 반환
        "mask": request.image_base64,
        "mask_gray": request.image_base64,
        "pose_img_tensor": "",  # Mock: 빈 텐서
    }


@app.post("/vton/preprocess-garment")
async def preprocess_garment(request: GarmentPreprocessRequest):
    """
    옷 이미지 전처리: 리사이즈 + 텐서 변환
    TODO: 실제 IDM-VTON 모델 통합 필요
    """
    logger.warning("[VTON] preprocess-garment called - Mock implementation")
    return {
        "garm_img": request.image_base64,  # Mock: 원본 그대로 반환
        "garm_tensor": "",  # Mock: 빈 텐서
    }


@app.post("/vton/preprocess-text")
async def preprocess_text(request: TextPreprocessRequest):
    """
    텍스트 인코딩: CLIP 텍스트 임베딩
    TODO: 실제 IDM-VTON CLIP 모델 통합 필요
    """
    logger.warning("[VTON] preprocess-text called - Mock implementation")
    return {
        "prompt_embeds": "",
        "negative_prompt_embeds": "",
        "pooled_prompt_embeds": "",
        "negative_pooled_prompt_embeds": "",
        "prompt_embeds_c": "",
    }


@app.post("/vton/generate-tryon")
async def generate_tryon(request: VtonGenerateRequest):
    """
    캐시된 데이터로 Diffusion 실행
    TODO: 실제 IDM-VTON Diffusion 파이프라인 통합 필요
    """
    logger.warning("[VTON] generate-tryon called - Mock implementation")
    # Mock: 빈 이미지 반환 (실제로는 S3에서 캐시 데이터를 가져와 Diffusion 실행)
    return {
        "result_image_base64": "",  # Mock: 빈 이미지
        "processing_time": 0.5,
    }
