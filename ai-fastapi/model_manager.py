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
        필요한 모든 모델(YOLOv11, SAM2, FashionSigLIP, CLIP)을 로드합니다.
        """
        logger.info("모델 로딩 시작...")
        
        # 1. YOLOv11 로드
        self._load_yolo()

        # 2. SAM2 로드
        self._load_sam2()

        # 3. Marqo-FashionSigLIP 로드 (이미지 임베딩용)
        self._load_fashion_siglip()

        # 4. CLIP 로드 (텍스트 임베딩용)
        self._load_clip()

        logger.info("모든 모델 로딩 완료.")

    def _load_yolo(self):
        """2-Stage Cascade Detection 모델 로딩"""
        try:
            # Stage 1: yolov8n-clothing-detection (의류/신발/가방/액세서리 분류)
            logger.info("[Stage 1] yolov8n-clothing-detection 모델 로딩 중...")
            stage1_path = './checkpoints/yolov8n-clothing/best.pt'
            self.models['yolo_stage1'] = YOLO(stage1_path)
            if self.device == 'cuda':
                self.models['yolo_stage1'].to('cuda')
            logger.info("[Stage 1] yolov8n-clothing-detection 모델 로딩 성공.")
            # 클래스: 0=Clothing, 1=Shoes, 2=Bags, 3=Accessories
            
            # Stage 2: DeepFashion2 (의류 상세 분류)
            logger.info("[Stage 2] DeepFashion2 YOLOv8s-seg 모델 로딩 중...")
            stage2_path = './checkpoints/deepfashion2_yolov8s-seg.pt'
            self.models['yolo_stage2'] = YOLO(stage2_path)
            if self.device == 'cuda':
                self.models['yolo_stage2'].to('cuda')
            logger.info("[Stage 2] DeepFashion2 YOLOv8s-seg 모델 로딩 성공.")
            # 클래스: short_sleeve_top, long_sleeve_top, shorts, trousers 등 13종
            
        except Exception as e:
            logger.error(f"2-Stage YOLO 모델 로딩 실패: {e}")
            # Fallback to single model
            logger.info("Fallback: 기본 DeepFashion2 모델만 사용...")
            try:
                stage2_path = './checkpoints/deepfashion2_yolov8s-seg.pt'
                self.models['yolo_stage2'] = YOLO(stage2_path)
                if self.device == 'cuda':
                    self.models['yolo_stage2'].to('cuda')
                logger.info("Fallback 성공: DeepFashion2 모델 로드됨.")
            except Exception as e2:
                logger.error(f"Fallback 모델 로딩도 실패: {e2}")

    def _load_sam2(self):
        try:
            logger.info("SAM2 모델 로딩 중...")
            if build_sam2 is None or SAM2ImagePredictor is None:
                raise ImportError("sam2 라이브러리를 찾을 수 없습니다. pip install sam2 실행 필요")

            # SAM2 체크포인트와 설정 파일 경로 설정
            checkpoint = "./checkpoints/sam2_hiera_large.pt"
            # SAM2.0 config (체크포인트 버전과 일치)
            model_cfg = "configs/sam2/sam2_hiera_l"
            
            # 체크포인트 파일 존재 확인
            import os
            if not os.path.exists(checkpoint):
                raise FileNotFoundError(f"SAM2 체크포인트 파일이 없습니다: {checkpoint}")
            
            # SAM2 모델 빌드 및 ImagePredictor 생성
            sam2_model = build_sam2(model_cfg, checkpoint, device=self.device)
            self.models['sam2'] = SAM2ImagePredictor(sam2_model)
            
            logger.info("SAM2 모델 로딩 성공.")
            
        except Exception as e:
            logger.error(f"SAM2 모델 로딩 실패: {e}")
            logger.warning("SAM2 없이 진행합니다. 세그멘테이션 대신 단순 크롭 사용.")

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

    def _load_clip(self):
        """CLIP 모델 로딩 (텍스트 임베딩용)"""
        try:
            logger.info("CLIP 모델 로딩 중 (ViT-B-32)...")
            # ViT-B-32는 가볍고 빠른 CLIP 모델
            model, _, preprocess = open_clip.create_model_and_transforms(
                'ViT-B-32', 
                pretrained='openai',
                device=self.device
            )
            tokenizer = open_clip.get_tokenizer('ViT-B-32')
            
            self.models['clip'] = {
                'model': model,
                'preprocess': preprocess,
                'tokenizer': tokenizer
            }
            logger.info("CLIP 모델 로딩 성공 (ViT-B-32, 512차원).")
            
        except Exception as e:
            logger.error(f"CLIP 모델 로딩 실패: {e}")

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

    def extract_text_embedding(self, text: str):
        """
        텍스트를 받아 CLIP 모델을 통해 텍스트 임베딩을 추출합니다.
        Args:
            text (str): 임베딩할 텍스트 (영문, 예: "White Solid Casual Formal Spring")
        Returns:
            list: 정규화된 임베딩 벡터 (float 리스트, 길이 512)
        """
        if 'clip' not in self.models:
            logger.error("CLIP 모델이 로드되지 않았습니다.")
            return [0.0] * 512

        try:
            model_dict = self.models['clip']
            model = model_dict['model']
            tokenizer = model_dict['tokenizer']

            # 텍스트 토큰화
            text_tokens = tokenizer([text]).to(self.device)

            with torch.no_grad():
                # 텍스트 인코딩
                text_features = model.encode_text(text_tokens)
                # 정규화
                text_features /= text_features.norm(dim=-1, keepdim=True)
            
            # CPU로 이동 및 리스트 변환
            return text_features.cpu().numpy()[0].tolist()

        except Exception as e:
            logger.error(f"텍스트 임베딩 추출 실패: {e}")
            return [0.0] * 512

    def predict_yolo(self, image, conf=0.5):
        """
        2-Stage Cascade Detection:
        - Stage 1: yolov8n-clothing-detection으로 Clothing/Shoes/Bags/Accessories 분류
        - Stage 2: Clothing으로 분류된 영역에 DeepFashion2 적용하여 상세 분류
        
        Args:
            image (numpy.ndarray): 입력 이미지
            conf (float): 자신감 임계값 (기본값 0.5로 낮은 확신도 필터링)
        Returns:
            list: 탐지된 객체 정보 리스트 (label, confidence, xyxy box)
        """
        detections = []
        h, w = image.shape[:2]
        
        # Stage 1: 의류/신발/가방/액세서리 분류
        if 'yolo_stage1' in self.models:
            try:
                stage1_results = self.models['yolo_stage1'](image, conf=conf)
                
                for result in stage1_results:
                    boxes = result.boxes
                    for box in boxes:
                        cls_id = int(box.cls[0])
                        label = result.names[cls_id]
                        confidence = float(box.conf[0])
                        xyxy = box.xyxy[0].cpu().numpy()
                        
                        # Shoes는 그대로 추가
                        if label.lower() == 'shoes':
                            detections.append({
                                "label": "shoes",
                                "confidence": confidence,
                                "box": xyxy
                            })
                        
                        # Clothing은 Stage 2 비활성화 - Bedrock에서 상세 분류 담당
                        elif label.lower() == 'clothing':
                            # Stage 2 비활성화: 일반 clothing으로 추가
                            # Bedrock Claude가 상세 분류 (category, sub_category 등) 처리
                            detections.append({
                                "label": "clothing",
                                "confidence": confidence,
                                "box": xyxy
                            })
                        
                        # Bags, Accessories는 무시 (의류 앱이므로)
                        
            except Exception as e:
                logger.error(f"Stage 1 YOLO 예측 실패: {e}")
        
        # Fallback: Stage 1이 없으면 Stage 2만 사용
        elif 'yolo_stage2' in self.models:
            try:
                results = self.models['yolo_stage2'](image, conf=conf)
                for result in results:
                    boxes = result.boxes
                    for box in boxes:
                        cls_id = int(box.cls[0])
                        label = result.names[cls_id]
                        confidence = float(box.conf[0])
                        xyxy = box.xyxy[0].cpu().numpy()
                        
                        detections.append({
                            "label": label,
                            "confidence": confidence,
                            "box": xyxy
                        })
            except Exception as e:
                logger.error(f"Stage 2 YOLO 예측 실패: {e}")
        
        # 중복 제거: 같은 라벨의 겹치는 박스 병합 (IoU > 0.3)
        detections = self._nms_by_label(detections, iou_threshold=0.3)
        
        return detections
    
    def _calculate_iou(self, box1, box2):
        """두 박스의 IoU(Intersection over Union) 계산"""
        x1 = max(box1[0], box2[0])
        y1 = max(box1[1], box2[1])
        x2 = min(box1[2], box2[2])
        y2 = min(box1[3], box2[3])
        
        inter_area = max(0, x2 - x1) * max(0, y2 - y1)
        box1_area = (box1[2] - box1[0]) * (box1[3] - box1[1])
        box2_area = (box2[2] - box2[0]) * (box2[3] - box2[1])
        union_area = box1_area + box2_area - inter_area
        
        return inter_area / union_area if union_area > 0 else 0
    
    def _nms_by_label(self, detections, iou_threshold=0.3):
        """같은 라벨끼리 NMS 적용하여 중복 박스 제거
        - shoes 라벨은 가까운 박스들을 하나의 union box로 합침 (한 쌍의 신발 처리)
        - 다른 라벨은 IoU 기반 NMS 적용
        """
        if not detections:
            return detections
        
        # 라벨별로 그룹화
        from collections import defaultdict
        label_groups = defaultdict(list)
        for d in detections:
            label_groups[d['label']].append(d)
        
        result = []
        for label, group in label_groups.items():
            
            # shoes는 가까운 박스들을 그룹으로 합침 (한 쌍의 신발 처리)
            if label.lower() == 'shoes':
                shoe_groups = self._group_nearby_shoes(group)
                for shoe_group in shoe_groups:
                    if len(shoe_group) >= 1:
                        # 그룹 내 모든 박스를 포함하는 union box 계산
                        all_boxes = [d['box'] for d in shoe_group]
                        x1 = min(b[0] for b in all_boxes)
                        y1 = min(b[1] for b in all_boxes)
                        x2 = max(b[2] for b in all_boxes)
                        y2 = max(b[3] for b in all_boxes)
                        
                        # 가장 높은 confidence 사용
                        max_conf = max(d['confidence'] for d in shoe_group)
                        
                        result.append({
                            "label": "shoes",
                            "confidence": max_conf,
                            "box": np.array([x1, y1, x2, y2])
                        })
            else:
                # 다른 라벨은 IoU 기반 NMS
                group = sorted(group, key=lambda x: x['confidence'], reverse=True)
                keep = []
                
                while group:
                    best = group.pop(0)
                    keep.append(best)
                    
                    # IoU가 threshold 이상인 박스 제거
                    group = [d for d in group 
                            if self._calculate_iou(best['box'], d['box']) < iou_threshold]
                
                result.extend(keep)
        
        return result
    
    def _group_nearby_shoes(self, shoe_detections, proximity_ratio=2.0):
        """가까이 있는 신발 박스들을 그룹으로 묶음 (한 쌍의 신발 처리)
        
        Args:
            shoe_detections: 신발 탐지 결과 리스트
            proximity_ratio: 박스 크기 대비 거리 비율 (이 비율 이내면 같은 그룹)
        
        Returns:
            list: 그룹화된 신발 탐지 리스트의 리스트
        """
        if len(shoe_detections) <= 1:
            return [shoe_detections] if shoe_detections else []
        
        # 이미 그룹에 할당된 인덱스 추적
        assigned = set()
        groups = []
        
        for i, det1 in enumerate(shoe_detections):
            if i in assigned:
                continue
            
            # 새 그룹 시작
            current_group = [det1]
            assigned.add(i)
            
            box1 = det1['box']
            center1 = ((box1[0] + box1[2]) / 2, (box1[1] + box1[3]) / 2)
            size1 = max(box1[2] - box1[0], box1[3] - box1[1])
            
            for j, det2 in enumerate(shoe_detections):
                if j in assigned:
                    continue
                
                box2 = det2['box']
                center2 = ((box2[0] + box2[2]) / 2, (box2[1] + box2[3]) / 2)
                size2 = max(box2[2] - box2[0], box2[3] - box2[1])
                
                # 두 박스 중심 간 거리 계산
                distance = ((center1[0] - center2[0])**2 + (center1[1] - center2[1])**2)**0.5
                avg_size = (size1 + size2) / 2
                
                # 거리가 박스 크기의 proximity_ratio 배 이내면 같은 그룹
                # 또는 Y좌표가 비슷하면 (같은 줄에 있는 신발)
                y_diff = abs(center1[1] - center2[1])
                
                if distance < avg_size * proximity_ratio or (y_diff < avg_size * 0.5 and distance < avg_size * 3.0):
                    current_group.append(det2)
                    assigned.add(j)
            
            groups.append(current_group)
        
        logger.info(f"[Shoes] {len(shoe_detections)}개 신발 박스 → {len(groups)}개 그룹으로 병합")
        return groups

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

