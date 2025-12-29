from contextlib import asynccontextmanager
from fastapi import FastAPI
from model_manager import ModelManager
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
