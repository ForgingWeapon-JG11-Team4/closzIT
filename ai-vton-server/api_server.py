"""
IDM-VTON FastAPI Server
기존 IDM-VTON 모델을 FastAPI로 감싸서 제공
설치 위치: ~/app/virtual-try/IDM-VTON/api_server.py
"""

import sys
import os

# IDM-VTON gradio_demo 모듈 경로 추가
IDMVTON_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(IDMVTON_ROOT, 'gradio_demo'))

# ============================================================================
# IDM-VTON 모델 초기화 (app_optimized.py의 init_code 부분)
# ============================================================================
print("=" * 80)
print("🚀 Initializing IDM-VTON models...")
print("=" * 80)

with open('gradio_demo/app.py', 'r') as f:
    app_code = f.read()

# 모델 로딩 코드 추출 및 실행
init_code = app_code.split('def start_tryon')[0].split('garm_list = os.listdir')[0]
exec(init_code)

import numpy as np
import time
import io
import base64
from PIL import Image
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI 앱 생성
app = FastAPI(title="IDM-VTON API Server", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# 캐시 저장소 (메모리)
# ============================================================================
human_cache = {}
garment_cache = {}
text_cache = {}

# ============================================================================
# Request/Response Models
# ============================================================================

class HumanPreprocessRequest(BaseModel):
    image_base64: str

class HumanPreprocessResponse(BaseModel):
    human_img: str
    mask: str
    mask_gray: str
    pose_img_tensor: str  # "cached" 문자열로 반환 (실제 텐서는 메모리에)

class GarmentPreprocessRequest(BaseModel):
    image_base64: str

class GarmentPreprocessResponse(BaseModel):
    garm_img: str
    garm_tensor: str  # "cached" 문자열로 반환

class TextPreprocessRequest(BaseModel):
    garment_description: str

class TextPreprocessResponse(BaseModel):
    prompt_embeds: str
    negative_prompt_embeds: str
    pooled_prompt_embeds: str
    negative_pooled_prompt_embeds: str
    prompt_embeds_c: str

class VtonGenerateRequest(BaseModel):
    user_id: str
    clothing_id: str
    denoise_steps: int = 20
    seed: int = 42

class VtonGenerateResponse(BaseModel):
    result_image_base64: str
    processing_time: float

# ============================================================================
# Helper Functions
# ============================================================================

def base64_to_pil(base64_str: str) -> Image.Image:
    """Base64 → PIL Image"""
    image_data = base64.b64decode(base64_str)
    image = Image.open(io.BytesIO(image_data))
    return image

def pil_to_base64(pil_img: Image.Image) -> str:
    """PIL Image → Base64"""
    buffered = io.BytesIO()
    pil_img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode('utf-8')

# ============================================================================
# 전처리 함수 (app_optimized.py 기반)
# ============================================================================

def preprocess_human_internal(human_img: Image.Image, human_id: str):
    """사람 전처리 - OpenPose + Parsing + DensePose"""
    logger.info(f"⏳ Preprocessing human: {human_id}")
    start = time.time()

    if isinstance(human_img, np.ndarray):
        human_img = Image.fromarray(human_img)

    human_img = human_img.convert("RGB").resize((768, 1024))
    human_img_arg = _apply_exif_orientation(human_img.resize((384, 512)))
    human_img_arg = convert_PIL_to_numpy(human_img_arg, format="BGR")

    args = apply_net.create_argument_parser().parse_args(
        ['show', './configs/densepose_rcnn_R_50_FPN_s1x.yaml',
         './ckpt/densepose/model_final_162be9.pkl', 'dp_segm', '-v',
         '--opts', 'MODEL.DEVICE', 'cuda']
    )

    # OpenPose
    keypoints = openpose_model(human_img.resize((384, 512)))

    # Parsing
    model_parse, _ = parsing_model(human_img.resize((384, 512)))
    mask, mask_gray = get_mask_location('hd', "upper_body", model_parse, keypoints)
    mask = mask.resize((768, 1024))

    # DensePose
    pose_img = args.func(args, human_img_arg)
    pose_img = pose_img[:,:,::-1]
    pose_img = Image.fromarray(pose_img).resize((768, 1024))
    pose_img_tensor = tensor_transfrom(pose_img).unsqueeze(0).to(device, torch.float16)

    # 캐시 저장
    human_cache[human_id] = {
        'human_img': human_img,
        'mask': mask,
        'mask_gray': mask_gray,
        'pose_img_tensor': pose_img_tensor,
    }

    elapsed = time.time() - start
    logger.info(f"✅ Human {human_id} cached in {elapsed:.2f}s")

    return {
        'human_img': pil_to_base64(human_img),
        'mask': pil_to_base64(mask),
        'mask_gray': pil_to_base64(mask_gray),
        'pose_img_tensor': "cached",
        'elapsed': elapsed,
    }

def preprocess_garment_internal(garm_img: Image.Image, garment_id: str):
    """옷 전처리"""
    logger.info(f"⏳ Preprocessing garment: {garment_id}")
    start = time.time()

    if isinstance(garm_img, np.ndarray):
        garm_img = Image.fromarray(garm_img)

    garm_img = garm_img.convert("RGB").resize((768, 1024))
    garm_img_resized = garm_img.resize((384, 512))
    garm_tensor = tensor_transfrom(garm_img_resized).unsqueeze(0).to(device, torch.float16)

    # 캐시 저장
    garment_cache[garment_id] = {
        'garm_img': garm_img,
        'garm_tensor': garm_tensor,
    }

    elapsed = time.time() - start
    logger.info(f"✅ Garment {garment_id} cached in {elapsed:.2f}s")

    return {
        'garm_img': pil_to_base64(garm_img),
        'garm_tensor': "cached",
        'elapsed': elapsed,
    }

def preprocess_text_internal(garment_des: str):
    """텍스트 인코딩"""
    if garment_des in text_cache:
        logger.info(f"✅ Text already cached: '{garment_des}'")
        return {'status': 'already_cached', 'elapsed': 0}

    logger.info(f"⏳ Encoding text: '{garment_des}'")
    start = time.time()

    prompt = "model wearing " + garment_des
    prompt_c = "a photo of " + garment_des
    negative_prompt = "monochrome, lowres, bad anatomy, worst quality, low quality"

    with torch.no_grad():
        pipe.to(device)
        original_dtype = pipe.text_encoder.dtype
        pipe.text_encoder.to(torch.float32)
        pipe.text_encoder_2.to(torch.float32)

        prompt_embeds, negative_prompt_embeds, pooled_prompt_embeds, negative_pooled_prompt_embeds = pipe.encode_prompt(
            prompt, num_images_per_prompt=1, do_classifier_free_guidance=True, negative_prompt=negative_prompt
        )

        prompt_embeds_c, _, _, _ = pipe.encode_prompt(
            prompt_c, num_images_per_prompt=1, do_classifier_free_guidance=False, negative_prompt=negative_prompt
        )

        pipe.text_encoder.to(original_dtype)
        pipe.text_encoder_2.to(original_dtype)
        pipe.to(device)

    # 캐시 저장
    text_cache[garment_des] = {
        'prompt_embeds': prompt_embeds.to(device, torch.float16),
        'negative_prompt_embeds': negative_prompt_embeds.to(device, torch.float16),
        'pooled_prompt_embeds': pooled_prompt_embeds.to(device, torch.float16),
        'negative_pooled_prompt_embeds': negative_pooled_prompt_embeds.to(device, torch.float16),
        'prompt_embeds_c': prompt_embeds_c.to(device, torch.float16),
    }

    elapsed = time.time() - start
    logger.info(f"✅ Text cached in {elapsed:.2f}s")

    return {'status': 'cached', 'elapsed': elapsed}

def generate_tryon_internal(human_id: str, garment_id: str, garment_des: str, denoise_steps: int, seed: int):
    """실시간 생성 - Diffusion만 실행"""
    if human_id not in human_cache:
        raise ValueError(f"Human '{human_id}' not found in cache")
    if garment_id not in garment_cache:
        raise ValueError(f"Garment '{garment_id}' not found in cache")
    if garment_des not in text_cache:
        raise ValueError(f"Text '{garment_des}' not cached")

    logger.info(f"⚡ Generating: {human_id} + {garment_id}")
    start = time.time()

    human_data = human_cache[human_id]
    garment_data = garment_cache[garment_id]
    text_data = text_cache[garment_des]

    with torch.no_grad():
        generator = torch.Generator(device).manual_seed(int(seed))

        images = pipe(
            prompt_embeds=text_data['prompt_embeds'],
            negative_prompt_embeds=text_data['negative_prompt_embeds'],
            pooled_prompt_embeds=text_data['pooled_prompt_embeds'],
            negative_pooled_prompt_embeds=text_data['negative_pooled_prompt_embeds'],
            num_inference_steps=int(denoise_steps),
            generator=generator,
            strength=1.0,
            pose_img=human_data['pose_img_tensor'],
            text_embeds_cloth=text_data['prompt_embeds_c'],
            cloth=garment_data['garm_tensor'],
            mask_image=human_data['mask'],
            image=human_data['human_img'],
            height=1024,
            width=768,
            ip_adapter_image=garment_data['garm_img'],
            guidance_scale=2.0,
        )[0]

    elapsed = time.time() - start
    logger.info(f"⚡ Generated in {elapsed:.2f}s")

    return images[0], elapsed

# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/")
def root():
    return {
        "service": "IDM-VTON API Server",
        "status": "running",
        "port": 8001,
        "environment": "conda",
        "models_loaded": True,
        "cache_stats": {
            "humans": len(human_cache),
            "garments": len(garment_cache),
            "texts": len(text_cache),
        }
    }

@app.get("/health")
def health_check():
    """서버 상태 확인"""
    return {
        "status": "healthy",
        "models_loaded": True,
        "cache_stats": {
            "humans": len(human_cache),
            "garments": len(garment_cache),
            "texts": len(text_cache),
        }
    }

@app.post("/vton/preprocess-human", response_model=HumanPreprocessResponse)
async def preprocess_human(request: HumanPreprocessRequest):
    """
    사람 이미지 전처리: OpenPose + Parsing + DensePose
    Cache Key: user_id
    """
    try:
        # Base64 → PIL
        human_img = base64_to_pil(request.image_base64)

        # 임시 ID 생성 (실제로는 NestJS에서 user_id를 URL 파라미터로 받아야 함)
        # 현재는 이미지 해시를 ID로 사용
        human_id = f"human_{hash(request.image_base64) % 1000000}"

        # 전처리
        result = preprocess_human_internal(human_img, human_id)

        return HumanPreprocessResponse(
            human_img=result['human_img'],
            mask=result['mask'],
            mask_gray=result['mask_gray'],
            pose_img_tensor=result['pose_img_tensor'],
        )
    except Exception as e:
        logger.error(f"Error in preprocess_human: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/vton/preprocess-garment", response_model=GarmentPreprocessResponse)
async def preprocess_garment(request: GarmentPreprocessRequest):
    """
    옷 이미지 전처리: 리사이즈 + 텐서 변환
    Cache Key: clothing_id
    """
    try:
        # Base64 → PIL
        garm_img = base64_to_pil(request.image_base64)

        # 임시 ID 생성
        garment_id = f"garment_{hash(request.image_base64) % 1000000}"

        # 전처리
        result = preprocess_garment_internal(garm_img, garment_id)

        return GarmentPreprocessResponse(
            garm_img=result['garm_img'],
            garm_tensor=result['garm_tensor'],
        )
    except Exception as e:
        logger.error(f"Error in preprocess_garment: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/vton/preprocess-text", response_model=TextPreprocessResponse)
async def preprocess_text(request: TextPreprocessRequest):
    """
    텍스트 인코딩: CLIP 텍스트 임베딩
    Cache Key: garment_description
    """
    try:
        # 텍스트 인코딩
        result = preprocess_text_internal(request.garment_description)

        return TextPreprocessResponse(
            prompt_embeds="cached",
            negative_prompt_embeds="cached",
            pooled_prompt_embeds="cached",
            negative_pooled_prompt_embeds="cached",
            prompt_embeds_c="cached",
        )
    except Exception as e:
        logger.error(f"Error in preprocess_text: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/vton/generate-tryon", response_model=VtonGenerateResponse)
async def generate_tryon(request: VtonGenerateRequest):
    """
    캐시된 데이터로 Diffusion 실행

    Note: 현재 구현은 임시 해시 ID를 사용합니다.
    실제로는 S3에서 캐시를 로드하거나, user_id/clothing_id를 직접 받아야 합니다.
    """
    try:
        # 임시: user_id와 clothing_id를 그대로 캐시 키로 사용
        human_id = request.user_id
        garment_id = request.clothing_id

        # 기본 description (실제로는 S3에서 로드하거나 파라미터로 받아야 함)
        garment_des = "a shirt"  # TODO: 실제 description 가져오기

        # 생성
        result_img, elapsed = generate_tryon_internal(
            human_id, garment_id, garment_des, request.denoise_steps, request.seed
        )

        # PIL → Base64
        result_base64 = pil_to_base64(result_img)

        return VtonGenerateResponse(
            result_image_base64=result_base64,
            processing_time=elapsed,
        )
    except ValueError as e:
        logger.error(f"Cache miss: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error in generate_tryon: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# S3 캐시 로드 엔드포인트 (향후 구현)
# ============================================================================

@app.post("/vton/load-cache-from-s3")
async def load_cache_from_s3(user_id: str, clothing_id: str):
    """
    S3에서 캐시 데이터 로드

    TODO:
    1. S3에서 users/{user_id}/vton-cache/*.pkl 다운로드
    2. PyTorch 텐서 역직렬화
    3. 메모리 캐시에 로드
    """
    raise HTTPException(status_code=501, detail="Not implemented yet")

# ============================================================================
# 서버 실행
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("VTON_PORT", "8001"))

    logger.info("=" * 80)
    logger.info("✅ IDM-VTON Models Loaded Successfully!")
    logger.info(f"🚀 Starting FastAPI server on port {port}...")
    logger.info("=" * 80)

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )
