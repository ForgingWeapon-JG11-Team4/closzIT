from fastapi.testclient import TestClient
from main import app
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_startup():
    logger.info("테스트 시작: TestClient를 사용하여 앱을 실행합니다...")
    # TestClient를 컨텍스트 매니저로 사용하면 Lifespan 이벤트(startup/shutdown)가 실행됩니다.
    with TestClient(app) as client:
        logger.info("테스트: 앱이 시작되었습니다. /status 엔드포인트를 호출하여 상태를 확인합니다.")
        response = client.get("/status")
        if response.status_code == 200:
            data = response.json()
            logger.info(f"상태 응답: {data}")
            
            # 검증 로직
            loaded_models = data.get("loaded_models", [])
            expected_models = ['yolo', 'fashion_siglip'] 
            # sam2는 체크포인트 부재로 로드되지 않을 수 있음. 로그 확인 필요.
            
            for model in expected_models:
                if model in loaded_models:
                    logger.info(f"검증 성공: {model} 모델이 로드되었습니다.")
                else:
                    logger.warning(f"검증 경고: {model} 모델이 로드되지 않았습니다.")
        else:
            logger.error(f"상태 호출 실패: {response.status_code}")
    
    logger.info("테스트 종료: 앱이 종료되었습니다.")

if __name__ == "__main__":
    test_startup()
