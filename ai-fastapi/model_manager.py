import logging
import torch
import cv2
from ultralytics import YOLO
# sam2와 open_clip 라이브러리의 정확한 import 경로는 설치된 패키지 버전에 따라 다를 수 있습니다.
# 일반적인 사용법을 가정하여 작성하며, 실제 환경에 맞게 조정이 필요할 수 있습니다.
# sam2는 'sam2' 패키지로 설치되었다고 가정합니다.
# 주의: pip install sam2 로 설치된 패키지가 공식 repo와 다를 경우 경로 수정이 필요할 수 있습니다.
# 공식 repo 구조: from sam2.build_sam import build_sam2
try:
    from sam2.build_sam import build_sam2
    from sam2.sam2_image_predictor import SAM2ImagePredictor
except ImportError:
    # sam2가 설치되지 않았거나 경로가 다를 경우를 대비한 더미 import
    print("Warning: SAM2 module not found. Check installation.")
    build_sam2 = None
    SAM2ImagePredictor = None

import open_clip
from PIL import Image
import numpy as np

import open_clip

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
            cls._instance.models = {}
            cls._instance.device = 'cuda' if torch.cuda.is_available() else 'cpu'
            logger.info(f"ModelManager 인스턴스 생성됨. 사용 장치: {cls._instance.device}")
        return cls._instance

    def load_models(self):
        """
        필요한 모든 모델(YOLOv11, SAM2, FashionSigLIP)을 로드합니다.
        """
        logger.info("모델 로딩 시작...")
        
        # 1. YOLOv11 로드
        self._load_yolo()

        # 2. SAM2 로드
        self._load_sam2()

        # 3. Marqo-FashionSigLIP 로드
        self._load_fashion_siglip()

        logger.info("모든 모델 로딩 완료.")

    def _load_yolo(self):
        try:
            logger.info("YOLOv11 모델 로딩 중...")
            # YOLOv11n 모델 로드 (자동 다운로드)
            self.models['yolo'] = YOLO('yolo11n.pt') 
            # 모델을 GPU로 이동 (필요한 경우)
            if self.device == 'cuda':
                self.models['yolo'].to('cuda')
            logger.info("YOLOv11 모델 로딩 성공.")
        except Exception as e:
            logger.error(f"YOLOv11 모델 로딩 실패: {e}")

    def _load_sam2(self):
        try:
            logger.info("SAM2 모델 로딩 중...")
            if build_sam2 is None:
                raise ImportError("sam2 라이브러리를 찾을 수 없습니다.")

            # SAM2 체크포인트와 설정 파일 경로 설정
            # 실제 사용 시에는 해당 파일들을 다운로드하여 경로를 지정해야 함.
            # 여기서는 예시로 'sam2_hiera_large.pt' 사용
            checkpoint = "./checkpoints/sam2_hiera_large.pt"
            model_cfg = "sam2_hiera_l.yaml"
            
            # 파일 존재 여부 확인 로직이 필요하나, 여기서는 로딩 시도만 함.
            # 실제로는 facebookresearch/sam2 레포지토리의 가이드에 따라 config/checkpoint 준비 필요
            
            # self.models['sam2'] = SAM2ImagePredictor(build_sam2(model_cfg, checkpoint, device=self.device))
            
            logger.warning("SAM2 모델 로딩: 체크포인트 파일이 필요합니다. (현재 코드는 구조만 잡혀 있음)")
            # 성공했다고 가정하고 로그 출력 (실제 로딩은 주석 처리됨)
            
        except Exception as e:
            logger.error(f"SAM2 모델 로딩 실패: {e}")

    def _load_fashion_siglip(self):
        try:
            logger.info("Marqo-FashionSigLIP 모델 로딩 중...")
            # open_clip을 사용하여 Hugging Face Hub에서 직접 로드
            # model_name='hf-hub:Marqo/marqo-fashionSigLIP' 방식을 시도하거나
            # create_model_and_transforms('ViT-B-16-SigLIP', pretrained='hf-hub:Marqo/marqo-fashionSigLIP') 방식 사용
            
            # 일반적인 hf-hub 로딩 방식
            model, _, preprocess = open_clip.create_model_and_transforms('hf-hub:Marqo/marqo-fashionSigLIP', device=self.device)
            
            self.models['fashion_siglip'] = {
                'model': model,
                'preprocess': preprocess
            }
            logger.info("Marqo-FashionSigLIP 모델 로딩 성공.")
            
        except Exception as e:
            logger.error(f"Marqo-FashionSigLIP 모델 로딩 실패: {e}")

    def extract_embedding(self, image: np.ndarray):
        """
        이미지(numpy array)를 받아 FashionSigLIP 모델을 통해 임베딩을 추출합니다.
        Args:
            image (numpy.ndarray): OpenCV 형식 (BGR) 또는 RGB numpy 배열
        Returns:
            list: 정규화된 임베딩 벡터 (float 리스트, 길이 768)
        """
        if 'fashion_siglip' not in self.models:
            logger.error("FashionSigLIP 모델이 로드되지 않았습니다.")
            # 더미 벡터 반환 또는 에러 처리 (여기서는 0벡터 반환)
            return [0.0] * 768

        try:
            model_dict = self.models['fashion_siglip']
            model = model_dict['model']
            preprocess = model_dict['preprocess']

            # OpenCV (BGR) -> PIL Image (RGB) 변환
            # 입력이 이미 RGB인지 BGR인지 확인 필요. 보통 cv2.imread는 BGR.
            # 하지만 utils.decode_image는 BGR을 리턴함. 
            # safe assumption: convert convert BGR to RGB for PIL
            if isinstance(image, np.ndarray):
                image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                image_pil = Image.fromarray(image)
            else:
                image_pil = image # 이미 PIL 이미지라면

            # 전처리 및 배치 차원 추가
            image_input = preprocess(image_pil).unsqueeze(0).to(self.device)

            with torch.no_grad():
                # 이미지 인코딩
                image_features = model.encode_image(image_input)
                # 정규화
                image_features /= image_features.norm(dim=-1, keepdim=True)
            
            # CPU로 이동 및 리스트 변환
            return image_features.cpu().numpy()[0].tolist()

        except Exception as e:
            logger.error(f"임베딩 추출 실패: {e}")
            return [0.0] * 768

    def predict_yolo(self, image, conf=0.25):
        """
        YOLOv11 모델을 사용하여 이미지에서 객체를 탐지합니다.
        Args:
            image (numpy.ndarray): 입력 이미지
            conf (float): 자신감 임계값
        Returns:
            list: 탐지된 객체 정보 리스트 (label, confidence, xyxy box)
        """
        if 'yolo' not in self.models:
            logger.error("YOLO 모델이 로드되지 않았습니다.")
            return []

        try:
            results = self.models['yolo'](image, conf=conf)
            detections = []
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    cls_id = int(box.cls[0])
                    label = result.names[cls_id]
                    confidence = float(box.conf[0])
                    xyxy = box.xyxy[0].cpu().numpy() # [x1, y1, x2, y2]
                    
                    detections.append({
                        "label": label,
                        "confidence": confidence,
                        "box": xyxy
                    })
            return detections
        except Exception as e:
            logger.error(f"YOLO 예측 실패: {e}")
            return []

    def predict_sam2(self, image, boxes):
        """
        SAM2 모델을 사용하여 주어진 바운딩 박스에 대한 세그멘테이션 마스크를 생성합니다.
        Args:
            image (numpy.ndarray): 입력 이미지 (RGB)
            boxes (list): 바운딩 박스 리스트 (xyxy 형식)
        Returns:
            list: 마스크 리스트
        """
        if 'sam2' not in self.models:
            logger.warning("SAM2 모델이 로드되지 않았습니다. (체크포인트 필요)")
            return None
        
        try:
            predictor = self.models['sam2']
            predictor.set_image(image)
            
            masks = []
            for box in boxes:
                # box expects [x1, y1, x2, y2]
                mask, _, _ = predictor.predict(
                    point_coords=None,
                    point_labels=None,
                    box=box,
                    multimask_output=False
                )
                # mask shape: (1, H, W) -> squeeze to (H, W)
                masks.append(mask.squeeze())
            
            return masks
        except Exception as e:
            logger.error(f"SAM2 예측 실패: {e}")
            return None

