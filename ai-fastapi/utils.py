import cv2
import numpy as np
import base64

def decode_image(file_bytes: bytes) -> np.ndarray:
    """
    업로드된 이미지 바이트를 OpenCV 이미지(Numpy array)로 디코딩합니다.
    Args:
        file_bytes (bytes): 이미지 파일의 바이트 데이터
    Returns:
        np.ndarray: BGR 형식의 OpenCV 이미지
    """
    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

def apply_mask_and_crop(image: np.ndarray, mask: np.ndarray, box: list) -> np.ndarray:
    """
    이미지에 마스크를 적용하여 투명 배경을 만들고, 바운딩 박스 영역만큼 잘라냅니다.
    Args:
        image (np.ndarray): 원본 이미지 (BGR)
        mask (np.ndarray): 바이너리 마스크 (0 or 1, Shape: HxW)
        box (list): [x1, y1, x2, y2] 바운딩 박스
    Returns:
        np.ndarray: 투명 배경이 적용되고 크롭된 이미지 (BGRA)
    """
    # 마스크 크기를 이미지 크기에 맞게 조정 (필요한 경우)
    if mask.shape != image.shape[:2]:
        mask = cv2.resize(mask, (image.shape[1], image.shape[0]), interpolation=cv2.INTER_NEAREST)

    # BGRA 이미지 생성
    b, g, r = cv2.split(image)
    # 마스크를 0~255 범위로 변환 (1 -> 255)
    alpha = (mask * 255).astype(np.uint8)
    
    rgba = cv2.merge([b, g, r, alpha])
    
    # 바운딩 박스 좌표 정수 변환 및 클리핑
    h, w = image.shape[:2]
    x1, y1, x2, y2 = map(int, box)
    x1 = max(0, x1); y1 = max(0, y1)
    x2 = min(w, x2); y2 = min(h, y2)
    
    # 크롭
    cropped = rgba[y1:y2, x1:x2]
    return cropped

def encode_image_to_base64(image: np.ndarray) -> str:
    """
    OpenCV 이미지를 PNG 형식의 Base64 문자열로 인코딩합니다.
    Args:
        image (np.ndarray): 이미지 배열
    Returns:
        str: Base64 인코딩된 문자열
    """
    _, buffer = cv2.imencode('.png', image)
    b64_str = base64.b64encode(buffer).decode('utf-8')
    return b64_str
