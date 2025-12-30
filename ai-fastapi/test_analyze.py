from fastapi.testclient import TestClient
from main import app
import os
import base64
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 테스트 이미지 경로
TEST_IMAGE_PATH = r"C:\Users\User\Desktop\Jungle\clozit\clothes_data\woman_whole.webp"
OUTPUT_DIR = "test_results"

def test_analyze():
    logger.info("테스트 시작: /analyze 엔드포인트 검증")
    
    if not os.path.exists(TEST_IMAGE_PATH):
        logger.error(f"테스트 이미지가 없습니다: {TEST_IMAGE_PATH}")
        return

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    with TestClient(app) as client:
        with open(TEST_IMAGE_PATH, "rb") as f:
            logger.info("이미지 전송 중...")
            response = client.post("/analyze", files={"file": f})
        
        if response.status_code == 200:
            results = response.json()
            logger.info(f"분석 성공: {len(results)}개의 객체 탐지됨")
            
            for i, res in enumerate(results):
                label = res['label']
                conf = res['confidence']
                logger.info(f"객체 {i+1}: {label} ({conf:.2f})")
                
                # Base64 이미지 디코딩 및 저장
                image_data = base64.b64decode(res['image_base64'])
                output_path = os.path.join(OUTPUT_DIR, f"result_{i}_{label}.png")
                with open(output_path, "wb") as out_f:
                    out_f.write(image_data)
                logger.info(f"결과 저장됨: {output_path}")

        else:
            logger.error(f"분석 실패: {response.status_code}")
            logger.error(response.text)

if __name__ == "__main__":
    test_analyze()
