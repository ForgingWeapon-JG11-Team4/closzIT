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

def encode_image_to_base64(image: np.ndarray, max_size_bytes: int = 4 * 1024 * 1024) -> str:
    """
    OpenCV 이미지를 Base64 문자열로 인코딩합니다.
    이미지가 max_size_bytes를 초과하면 리사이즈 및 압축합니다.
    Args:
        image (np.ndarray): 이미지 배열
        max_size_bytes (int): 최대 허용 바이트 (기본 4MB, Bedrock 5MB 제한에 여유)
    Returns:
        str: Base64 인코딩된 문자열
    """
    # 먼저 PNG로 시도
    _, buffer = cv2.imencode('.png', image)
    
    # 크기가 작으면 바로 반환
    if len(buffer) <= max_size_bytes:
        return base64.b64encode(buffer).decode('utf-8')
    
    # 이미지가 크면 리사이즈 및 JPEG 압축 적용
    h, w = image.shape[:2]
    
    # 최대 1024px로 리사이즈
    max_dim = 1024
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        new_w, new_h = int(w * scale), int(h * scale)
        image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    
    # RGBA -> RGB 변환 (JPEG는 알파 채널 미지원)
    if image.shape[-1] == 4:
        # 알파 채널을 사용하여 흰 배경 합성
        alpha = image[:, :, 3:4] / 255.0
        rgb = image[:, :, :3]
        white_bg = np.ones_like(rgb, dtype=np.uint8) * 255
        image = (rgb * alpha + white_bg * (1 - alpha)).astype(np.uint8)
    
    # JPEG로 압축 (품질 조정)
    quality = 85
    while quality >= 30:
        _, buffer = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, quality])
        if len(buffer) <= max_size_bytes:
            return base64.b64encode(buffer).decode('utf-8')
        quality -= 10
    
    # 여전히 크면 추가 리사이즈
    h, w = image.shape[:2]
    image = cv2.resize(image, (w // 2, h // 2), interpolation=cv2.INTER_AREA)
    _, buffer = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, 70])
    
    return base64.b64encode(buffer).decode('utf-8')
