"""
IDM-VTON FastAPI Server (Production)
기존 IDM-VTON 모델을 FastAPI로 감싸서 제공
설치 위치: ~/app/virtual-try/IDM-VTON/api_server.py

캐싱 전략:
- 메모리 캐시 없음
- S3에 전처리 결과 저장 (UUID 기반)
- NestJS가 캐시 관리 책임
"""

import sys
import os

# Windows에서 UTF-8 출력 지원
if sys.platform == "win32":
    import io

    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

# IDM-VTON gradio_demo 모듈 경로 추가
IDMVTON_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(IDMVTON_ROOT, "gradio_demo"))

# ============================================================================
# IDM-VTON 모델 초기화
# ============================================================================
print("=" * 80)
print("🚀 Initializing IDM-VTON models...")
print("=" * 80)

with open("gradio_demo/app.py", "r") as f:
    app_code = f.read()

# 모델 로딩 코드 추출 및 실행
init_code = app_code.split("def start_tryon")[0].split("garm_list = os.listdir")[0]
exec(init_code, globals())

# ⭐ CRITICAL: Device를 CUDA로 강제 설정
import torch

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"=" * 80)
print(f"🎯 Device explicitly set to: {device}")
print(f"=" * 80)

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
import boto3
from botocore.exceptions import ClientError
import asyncio

# .env 파일 로드
try:
    from dotenv import load_dotenv

    load_dotenv()
    print("✅ .env file loaded successfully")
except ImportError:
    print("⚠️  python-dotenv not installed, using system environment variables")

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# S3 설정 확인
AWS_REGION = os.getenv("AWS_REGION", "ap-northeast-2")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET = os.getenv("AWS_S3_BUCKET", "your-bucket-name")

print("=" * 80)
print("🔑 S3 Configuration Check:")
print(f"   Region: {AWS_REGION}")
print(f"   Bucket: {S3_BUCKET}")
print(f"   Access Key: {'✅ Set' if AWS_ACCESS_KEY_ID else '❌ Missing'}")
print(f"   Secret Key: {'✅ Set' if AWS_SECRET_ACCESS_KEY else '❌ Missing'}")
print("=" * 80)

# S3 클라이언트 초기화
s3_client = boto3.client(
    "s3",
    region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
)

# FastAPI 앱 생성
app = FastAPI(title="IDM-VTON API Server", version="2.0.0")

# GPU 동시성 제어 (한 번에 하나의 diffusion만 실행)
gpu_lock = asyncio.Lock()
request_queue_size = 0

# GPU 최적화 플래그
GPU_OPTIMIZATIONS_ENABLED = False

# 🚀 메모리 캐시 (S3 다운로드 제거 - test.py처럼 빠르게!)
memory_cache = {
    "human_upper": {},  # user_id -> {human_img, mask, mask_gray, pose_tensor} for upper_body
    "human_lower": {},  # user_id -> {human_img, mask, mask_gray, pose_tensor} for lower_body
    "garment": {},  # clothing_id -> {garm_img, garm_tensor, category}
    "text": {},  # clothing_id -> {prompt_embeds, ..., category}
}

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Request/Response Models
# ============================================================================


class HumanPreprocessRequest(BaseModel):
    user_id: str  # UUID
    image_base64: str


class VtonGenerateRequestV2(BaseModel):
    """FastAPI가 S3에서 직접 다운로드 (최적화 버전)"""

    user_id: str  # UUID
    clothing_id: str  # UUID
    category: str = "upper_body"  # "upper_body" or "lower_body"
    denoise_steps: int = 10
    seed: int = 42


class VtonBatchGenerateRequest(BaseModel):
    """배치 처리용 - 여러 옷을 동시에 입어보기"""

    user_id: str
    clothing_ids: list[str]  # 여러 옷 ID
    denoise_steps: int = 10
    seed: int = 42


class VtonBatchGenerateResponse(BaseModel):
    results: list[dict]  # [{clothing_id, result_image_base64, processing_time}, ...]
    total_processing_time: float


class HumanPreprocessResponse(BaseModel):
    user_id: str
    processing_time: float
    message: str
    # Upper body data
    upper_body: dict  # {human_img, mask, mask_gray, pose_img_tensor}
    # Lower body data
    lower_body: dict  # {human_img, mask, mask_gray, pose_img_tensor}


class GarmentPreprocessRequest(BaseModel):
    user_id: str  # UUID
    clothing_id: str  # UUID
    image_base64: str
    category: str = "upper_body"  # "upper_body" or "lower_body"


class GarmentPreprocessResponse(BaseModel):
    user_id: str
    clothing_id: str
    processing_time: float
    message: str
    garm_img: str  # base64
    garm_tensor: str  # base64 (pickled tensor)


class TextPreprocessRequest(BaseModel):
    user_id: str  # UUID
    clothing_id: str  # UUID
    garment_description: str
    category: str = "upper_body"  # "upper_body" or "lower_body"


class TextPreprocessResponse(BaseModel):
    user_id: str
    clothing_id: str
    processing_time: float
    message: str
    prompt_embeds: str  # base64 (pickled tensor)
    negative_prompt_embeds: str  # base64 (pickled tensor)
    pooled_prompt_embeds: str  # base64 (pickled tensor)
    negative_pooled_prompt_embeds: str  # base64 (pickled tensor)
    prompt_embeds_c: str  # base64 (pickled tensor)


class VtonGenerateRequest(BaseModel):
    user_id: str  # UUID
    clothing_id: str  # UUID
    garment_description: str  # 캐시된 텍스트 임베딩 키
    denoise_steps: int = 10
    seed: int = 42
    # NestJS가 S3에서 로드한 캐시 데이터
    human_img: str  # base64
    mask: str  # base64
    mask_gray: str  # base64
    pose_tensor: str  # base64 (pickled)
    garm_img: str  # base64
    garm_tensor: str  # base64 (pickled)
    prompt_embeds: str  # base64 (pickled)
    negative_prompt_embeds: str  # base64 (pickled)
    pooled_prompt_embeds: str  # base64 (pickled)
    negative_pooled_prompt_embeds: str  # base64 (pickled)
    prompt_embeds_c: str  # base64 (pickled)


class VtonGenerateResponse(BaseModel):
    result_image_base64: str
    processing_time: float


# ============================================================================
# Helper Functions
# ============================================================================


def base64_to_pil(base64_str: str) -> Image.Image:
    """Base64 → PIL Image"""
    # data:image/png;base64, 제거
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]

    image_data = base64.b64decode(base64_str)
    image = Image.open(io.BytesIO(image_data))
    return image


def pil_to_base64(pil_img: Image.Image) -> str:
    """PIL Image → Base64"""
    buffered = io.BytesIO()
    pil_img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")


def tensor_to_base64(tensor: torch.Tensor) -> str:
    """PyTorch Tensor → Base64 (pickle 직렬화)"""
    import pickle

    buffer = io.BytesIO()
    pickle.dump(tensor.cpu(), buffer)
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")


def base64_to_tensor(base64_str: str, device_name: str = "cuda") -> torch.Tensor:
    """Base64 → PyTorch Tensor (pickle 역직렬화)"""
    import pickle

    buffer = io.BytesIO(base64.b64decode(base64_str))
    tensor = pickle.load(buffer)
    return tensor.to(device_name, torch.float16)


def download_from_s3(key: str) -> bytes:
    """S3에서 파일 다운로드"""
    try:
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=key)
        return response["Body"].read()
    except ClientError as e:
        logger.error(f"S3 download failed: {key} - {e}")
        raise HTTPException(status_code=404, detail=f"Cache not found in S3: {key}")


def download_s3_as_base64(key: str) -> str:
    """S3에서 다운로드 후 Base64로 반환"""
    data = download_from_s3(key)
    return base64.b64encode(data).decode("utf-8")


def download_s3_as_pil(key: str) -> Image.Image:
    """S3에서 다운로드 후 PIL Image로 반환"""
    data = download_from_s3(key)
    return Image.open(io.BytesIO(data))


def download_s3_as_tensor(key: str, device_name: str = "cuda") -> torch.Tensor:
    """S3에서 다운로드 후 PyTorch Tensor로 반환 (pickle)"""
    import pickle

    data = download_from_s3(key)
    tensor = pickle.loads(data)
    # ⚡ contiguous memory layout으로 변환 (diffusion 속도 개선)
    return tensor.to(device_name, torch.float16).contiguous()


# ============================================================================
# 전처리 함수
# ============================================================================


def preprocess_human_internal(
    human_img: Image.Image, category: str = "upper_body"
) -> dict:
    """
    사람 이미지 전처리: OpenPose + Parsing + DensePose

    Args:
        human_img: 사람 전신 이미지
        category: "upper_body" 또는 "lower_body"

    Returns:
        {
            'human_img': base64,
            'mask': base64,
            'mask_gray': base64,
            'pose_img_tensor': base64 (pickled tensor)
        }
    """
    logger.info(f"⏳ Preprocessing human image for {category}...")
    start = time.time()

    if isinstance(human_img, np.ndarray):
        human_img = Image.fromarray(human_img)

    # 원본 비율 유지하며 리사이즈
    original_size = human_img.size
    target_width, target_height = 768, 1024

    # 비율 계산
    aspect_ratio = original_size[0] / original_size[1]
    target_aspect = target_width / target_height

    if aspect_ratio > target_aspect:
        # 이미지가 더 넓음 -> 폭 기준으로 리사이즈
        new_width = target_width
        new_height = int(target_width / aspect_ratio)
    else:
        # 이미지가 더 높음 -> 높이 기준으로 리사이즈
        new_height = target_height
        new_width = int(target_height * aspect_ratio)

    # 리사이즈 후 중앙 크롭 또는 패딩
    human_img = human_img.convert("RGB").resize(
        (new_width, new_height), Image.Resampling.LANCZOS
    )

    # 768x1024로 중앙 크롭 또는 패딩
    if new_width < target_width or new_height < target_height:
        # 패딩 필요
        padded_img = Image.new("RGB", (target_width, target_height), (255, 255, 255))
        paste_x = (target_width - new_width) // 2
        paste_y = (target_height - new_height) // 2
        padded_img.paste(human_img, (paste_x, paste_y))
        human_img = padded_img
    elif new_width > target_width or new_height > target_height:
        # 크롭 필요
        left = (new_width - target_width) // 2
        top = (new_height - target_height) // 2
        human_img = human_img.crop(
            (left, top, left + target_width, top + target_height)
        )

    human_img_arg = _apply_exif_orientation(human_img.resize((384, 512)))
    human_img_arg = convert_PIL_to_numpy(human_img_arg, format="BGR")

    args = apply_net.create_argument_parser().parse_args(
        [
            "show",
            "./configs/densepose_rcnn_R_50_FPN_s1x.yaml",
            "./ckpt/densepose/model_final_162be9.pkl",
            "dp_segm",
            "-v",
            "--opts",
            "MODEL.DEVICE",
            "cuda",
        ]
    )

    # OpenPose
    keypoints = openpose_model(human_img.resize((384, 512)))

    # Parsing
    model_parse, _ = parsing_model(human_img.resize((384, 512)))
    mask, mask_gray = get_mask_location("hd", category, model_parse, keypoints)
    mask = mask.resize((768, 1024))

    # DensePose
    pose_img = args.func(args, human_img_arg)
    pose_img = pose_img[:, :, ::-1]
    pose_img = Image.fromarray(pose_img).resize((768, 1024))
    pose_img_tensor = tensor_transfrom(pose_img).unsqueeze(0).to(device, torch.float16)

    elapsed = time.time() - start
    logger.info(f"✅ Human preprocessing for {category} completed in {elapsed:.2f}s")

    return {
        "human_img": pil_to_base64(human_img),
        "mask": pil_to_base64(mask),
        "mask_gray": pil_to_base64(mask_gray),
        "pose_img_tensor": tensor_to_base64(pose_img_tensor),
        "elapsed": elapsed,
    }


def preprocess_garment_internal(garm_img: Image.Image) -> dict:
    """
    옷 이미지 전처리

    Returns:
        {
            'garm_img': base64,
            'garm_tensor': base64 (pickled tensor)
        }
    """
    logger.info("⏳ Preprocessing garment image...")
    start = time.time()

    if isinstance(garm_img, np.ndarray):
        garm_img = Image.fromarray(garm_img)

    # 원본 비율 유지하며 768x1024로 리사이즈
    garm_img = garm_img.convert("RGB")
    original_size = garm_img.size
    target_width, target_height = 768, 1024

    # 비율 계산
    aspect_ratio = original_size[0] / original_size[1]
    target_aspect = target_width / target_height

    if aspect_ratio > target_aspect:
        new_width = target_width
        new_height = int(target_width / aspect_ratio)
    else:
        new_height = target_height
        new_width = int(target_height * aspect_ratio)

    garm_img = garm_img.resize((new_width, new_height), Image.Resampling.LANCZOS)

    # 중앙 정렬로 768x1024 맞추기 (흰색 배경으로 패딩)
    if new_width < target_width or new_height < target_height:
        padded_img = Image.new("RGB", (target_width, target_height), (255, 255, 255))
        paste_x = (target_width - new_width) // 2
        paste_y = (target_height - new_height) // 2
        padded_img.paste(garm_img, (paste_x, paste_y))
        garm_img = padded_img
    elif new_width > target_width or new_height > target_height:
        left = (new_width - target_width) // 2
        top = (new_height - target_height) // 2
        garm_img = garm_img.crop((left, top, left + target_width, top + target_height))

    garm_img_resized = garm_img.resize((384, 512))
    garm_tensor = (
        tensor_transfrom(garm_img_resized).unsqueeze(0).to(device, torch.float16)
    )

    elapsed = time.time() - start
    logger.info(f"✅ Garment preprocessing completed in {elapsed:.2f}s")

    return {
        "garm_img": pil_to_base64(garm_img),
        "garm_tensor": tensor_to_base64(garm_tensor),
        "elapsed": elapsed,
    }


def preprocess_text_internal(garment_des: str) -> dict:
    """
    텍스트 인코딩: CLIP 텍스트 임베딩

    Returns:
        {
            'prompt_embeds': base64,
            'negative_prompt_embeds': base64,
            'pooled_prompt_embeds': base64,
            'negative_pooled_prompt_embeds': base64,
            'prompt_embeds_c': base64
        }
    """
    logger.info(f"⏳ Encoding text: '{garment_des}'")
    start = time.time()

    # Gradio 스타일: NestJS에서 전달받은 간결한 설명을 그대로 사용
    # 예: "Cardigan Gray Button" (이미 NestJS에서 간결하게 처리됨)
    prompt = "model is wearing " + garment_des
    prompt_c = "a photo of " + garment_des
    negative_prompt = "monochrome, lowres, bad anatomy, worst quality, low quality"

    # 📝 생성될 프롬프트 출력
    print(f"📝 Text prompt: '{garment_des}'")

    with torch.no_grad():
        # text_encoder만 float32로 변환 (test.py와 동일)
        original_dtype_1 = pipe.text_encoder.dtype
        original_dtype_2 = pipe.text_encoder_2.dtype
        pipe.text_encoder.to(torch.float32)
        pipe.text_encoder_2.to(torch.float32)

        (
            prompt_embeds,
            negative_prompt_embeds,
            pooled_prompt_embeds,
            negative_pooled_prompt_embeds,
        ) = pipe.encode_prompt(
            prompt,
            num_images_per_prompt=1,
            do_classifier_free_guidance=True,
            negative_prompt=negative_prompt,
        )

        prompt_embeds_c, _, _, _ = pipe.encode_prompt(
            prompt_c,
            num_images_per_prompt=1,
            do_classifier_free_guidance=False,
            negative_prompt=negative_prompt,
        )

        # 원래 dtype으로 복원 (test.py와 동일)
        pipe.text_encoder.to(original_dtype_1)
        pipe.text_encoder_2.to(original_dtype_2)

    elapsed = time.time() - start
    logger.info(f"✅ Text encoding completed in {elapsed:.2f}s")

    return {
        "prompt_embeds": tensor_to_base64(prompt_embeds.to(device, torch.float16)),
        "negative_prompt_embeds": tensor_to_base64(
            negative_prompt_embeds.to(device, torch.float16)
        ),
        "pooled_prompt_embeds": tensor_to_base64(
            pooled_prompt_embeds.to(device, torch.float16)
        ),
        "negative_pooled_prompt_embeds": tensor_to_base64(
            negative_pooled_prompt_embeds.to(device, torch.float16)
        ),
        "prompt_embeds_c": tensor_to_base64(prompt_embeds_c.to(device, torch.float16)),
        "elapsed": elapsed,
    }


def generate_tryon_internal(
    human_img: Image.Image,
    mask: Image.Image,
    mask_gray: Image.Image,
    pose_img_tensor: torch.Tensor,
    garm_img: Image.Image,
    garm_tensor: torch.Tensor,
    prompt_embeds: torch.Tensor,
    negative_prompt_embeds: torch.Tensor,
    pooled_prompt_embeds: torch.Tensor,
    negative_pooled_prompt_embeds: torch.Tensor,
    prompt_embeds_c: torch.Tensor,
    denoise_steps: int,
    seed: int,
) -> tuple:
    """
    Diffusion 생성 (캐시된 데이터 사용)

    Returns:
        (result_image: PIL.Image, elapsed: float)
    """
    logger.info(f"⚡ Generating try-on with diffusion (steps={denoise_steps})...")
    logger.info(
        f"🔍 Input tensor devices: pose={pose_img_tensor.device}, garm={garm_tensor.device}, prompt={prompt_embeds.device}"
    )
    logger.info(f"🔍 Pipeline device: unet={pipe.unet.device}, vae={pipe.vae.device}")
    start = time.time()

    # test.py 스타일: autocast 없이 순수하게 실행
    with torch.no_grad():
        generator = torch.Generator(device).manual_seed(int(seed))

        images = pipe(
            prompt_embeds=prompt_embeds,
            negative_prompt_embeds=negative_prompt_embeds,
            pooled_prompt_embeds=pooled_prompt_embeds,
            negative_pooled_prompt_embeds=negative_pooled_prompt_embeds,
            num_inference_steps=int(denoise_steps),
            generator=generator,
            strength=1.0,
            pose_img=pose_img_tensor,
            text_embeds_cloth=prompt_embeds_c,
            cloth=garm_tensor,
            mask_image=mask,
            image=human_img,
            height=1024,
            width=768,
            ip_adapter_image=garm_img,
            guidance_scale=2.0,
        )[
            0
        ]  # pipe() returns [[PIL.Image]], [0] gets first batch

    elapsed = time.time() - start
    logger.info(
        f"⚡ Diffusion completed in {elapsed:.2f}s ({elapsed/int(denoise_steps):.3f}s per step)"
    )

    # images is a list of PIL Images, get the first one
    return images[0], elapsed


# ============================================================================
# API Endpoints
# ============================================================================


@app.get("/")
def root():
    return {
        "service": "IDM-VTON API Server",
        "version": "2.0.0",
        "status": "running",
        "port": 8001,
        "environment": "production",
        "models_loaded": True,
        "caching": "S3-based (NestJS managed)",
    }


@app.get("/health")
def health_check():
    """서버 상태 확인"""
    return {
        "status": "healthy",
        "models_loaded": True,
        "caching": "Memory + S3 (Upper/Lower separated)",
        "cached_humans_upper": len(memory_cache["human_upper"]),
        "cached_humans_lower": len(memory_cache["human_lower"]),
        "cached_garments": len(memory_cache["garment"]),
        "cached_texts": len(memory_cache["text"]),
    }


@app.post("/vton/preprocess-human", response_model=HumanPreprocessResponse)
async def preprocess_human(request: HumanPreprocessRequest):
    """
    사람 이미지 전처리: OpenPose + Parsing + DensePose (Upper & Lower 모두 생성)

    NestJS가 결과를 받아서 S3에 저장:
    Upper body:
    - users/{user_id}/vton-cache/upper/human_img.png
    - users/{user_id}/vton-cache/upper/mask.png
    - users/{user_id}/vton-cache/upper/mask_gray.png
    - users/{user_id}/vton-cache/upper/pose_tensor.pkl

    Lower body:
    - users/{user_id}/vton-cache/lower/human_img.png
    - users/{user_id}/vton-cache/lower/mask.png
    - users/{user_id}/vton-cache/lower/mask_gray.png
    - users/{user_id}/vton-cache/lower/pose_tensor.pkl
    """
    try:
        logger.info(
            f"[preprocess-human] user_id={request.user_id} - Processing both upper and lower body"
        )
        start_time = time.time()

        # Base64 → PIL
        human_img = base64_to_pil(request.image_base64)

        # Upper body 전처리
        logger.info("[preprocess-human] Processing upper body...")
        upper_result = preprocess_human_internal(human_img, category="upper_body")

        # Lower body 전처리
        logger.info("[preprocess-human] Processing lower body...")
        lower_result = preprocess_human_internal(human_img, category="lower_body")

        total_elapsed = time.time() - start_time

        # NestJS가 S3에 업로드할 데이터 반환
        return HumanPreprocessResponse(
            user_id=request.user_id,
            processing_time=total_elapsed,
            message="Preprocessing completed for both upper and lower body",
            upper_body={
                "human_img": upper_result["human_img"],
                "mask": upper_result["mask"],
                "mask_gray": upper_result["mask_gray"],
                "pose_img_tensor": upper_result["pose_img_tensor"],
            },
            lower_body={
                "human_img": lower_result["human_img"],
                "mask": lower_result["mask"],
                "mask_gray": lower_result["mask_gray"],
                "pose_img_tensor": lower_result["pose_img_tensor"],
            },
        )
    except Exception as e:
        logger.error(f"[preprocess-human] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/vton/preprocess-garment", response_model=GarmentPreprocessResponse)
async def preprocess_garment(request: GarmentPreprocessRequest):
    """
    옷 이미지 전처리

    NestJS가 결과를 받아서 S3에 저장:
    - users/{user_id}/vton-cache/garments/{clothing_id}_img.png
    - users/{user_id}/vton-cache/garments/{clothing_id}_tensor.pkl
    """
    try:
        logger.info(
            f"[preprocess-garment] user_id={request.user_id}, clothing_id={request.clothing_id}"
        )

        # Base64 → PIL
        garm_img = base64_to_pil(request.image_base64)

        # 전처리
        result = preprocess_garment_internal(garm_img)

        return GarmentPreprocessResponse(
            user_id=request.user_id,
            clothing_id=request.clothing_id,
            processing_time=result["elapsed"],
            message="Preprocessing completed",
            garm_img=result["garm_img"],
            garm_tensor=result["garm_tensor"],
        )
    except Exception as e:
        logger.error(f"[preprocess-garment] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/vton/preprocess-text", response_model=TextPreprocessResponse)
async def preprocess_text(request: TextPreprocessRequest):
    """
    텍스트 인코딩: CLIP 텍스트 임베딩

    NestJS가 결과를 받아서 S3에 저장:
    - users/{user_id}/vton-cache/text/{clothing_id}_*.pkl
    """
    try:
        logger.info(
            f"[preprocess-text] user_id={request.user_id}, clothing_id={request.clothing_id}, text='{request.garment_description}'"
        )

        # 텍스트 인코딩
        result = preprocess_text_internal(request.garment_description)

        return TextPreprocessResponse(
            user_id=request.user_id,
            clothing_id=request.clothing_id,
            processing_time=result["elapsed"],
            message="Text encoding completed",
            prompt_embeds=result["prompt_embeds"],
            negative_prompt_embeds=result["negative_prompt_embeds"],
            pooled_prompt_embeds=result["pooled_prompt_embeds"],
            negative_pooled_prompt_embeds=result["negative_pooled_prompt_embeds"],
            prompt_embeds_c=result["prompt_embeds_c"],
        )
    except Exception as e:
        logger.error(f"[preprocess-text] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/vton/generate-tryon", response_model=VtonGenerateResponse)
async def generate_tryon(request: VtonGenerateRequestV2):
    """
    최적화 버전: FastAPI가 S3에서 직접 다운로드

    이점:
    - NestJS → FastAPI HTTP 전송 제거
    - S3 다운로드 병렬 처리
    - 예상 2-3초 단축
    """
    global request_queue_size

    # 큐 진입
    request_queue_size += 1
    queue_position = request_queue_size
    logger.info(f"[generate-tryon-v2] Request queued (position: {queue_position})")

    try:
        # GPU Lock 획득 (대기)
        async with gpu_lock:
            logger.info(
                f"[generate-tryon-v2] Processing started - user_id={request.user_id}, clothing_id={request.clothing_id}"
            )
            start_time = time.time()

            user_id = request.user_id
            clothing_id = request.clothing_id
            category = request.category  # "upper_body" or "lower_body"

            # 🚀 메모리 캐시 확인
            cache_data = {}
            download_start = time.time()

            # Human 캐시 확인 (category에 따라 upper 또는 lower)
            cache_key = "human_upper" if category == "upper_body" else "human_lower"
            if user_id in memory_cache[cache_key]:
                logger.info(f"✅ Human {category} cache HIT for user {user_id}")
                cache_data.update(memory_cache[cache_key][user_id])
                human_cached = True
            else:
                human_cached = False
                logger.info(f"❌ Human {category} cache MISS for user {user_id}")

            # Garment 캐시 확인
            if clothing_id in memory_cache["garment"]:
                logger.info(f"✅ Garment cache HIT for clothing {clothing_id}")
                cache_data.update(memory_cache["garment"][clothing_id])
                garment_cached = True
            else:
                garment_cached = False

            # Text 캐시 확인
            if clothing_id in memory_cache["text"]:
                logger.info(f"✅ Text cache HIT for clothing {clothing_id}")
                cache_data.update(memory_cache["text"][clothing_id])
                text_cached = True
            else:
                text_cached = False

            # S3에서 누락된 데이터만 다운로드
            if not (human_cached and garment_cached and text_cached):
                logger.info("⚡ Downloading missing cache from S3...")
                import concurrent.futures

                with concurrent.futures.ThreadPoolExecutor(max_workers=11) as executor:
                    futures = {}

                    # Human 데이터 다운로드 (캐시 미스 시) - category에 따라 upper/lower 선택
                    if not human_cached:
                        category_path = "upper" if category == "upper_body" else "lower"
                        futures.update(
                            {
                                "human_img": executor.submit(
                                    download_s3_as_pil,
                                    f"users/{user_id}/vton-cache/{category_path}/human_img.png",
                                ),
                                "mask": executor.submit(
                                    download_s3_as_pil,
                                    f"users/{user_id}/vton-cache/{category_path}/mask.png",
                                ),
                                "mask_gray": executor.submit(
                                    download_s3_as_pil,
                                    f"users/{user_id}/vton-cache/{category_path}/mask_gray.png",
                                ),
                                "pose_tensor": executor.submit(
                                    download_s3_as_tensor,
                                    f"users/{user_id}/vton-cache/{category_path}/pose_tensor.pkl",
                                    device,
                                ),
                            }
                        )

                    # Garment 데이터 다운로드 (캐시 미스 시)
                    if not garment_cached:
                        futures.update(
                            {
                                "garm_img": executor.submit(
                                    download_s3_as_pil,
                                    f"users/{user_id}/vton-cache/garments/{clothing_id}_img.png",
                                ),
                                "garm_tensor": executor.submit(
                                    download_s3_as_tensor,
                                    f"users/{user_id}/vton-cache/garments/{clothing_id}_tensor.pkl",
                                    device,
                                ),
                            }
                        )

                    # Text 데이터 다운로드 (캐시 미스 시)
                    if not text_cached:
                        futures.update(
                            {
                                "prompt_embeds": executor.submit(
                                    download_s3_as_tensor,
                                    f"users/{user_id}/vton-cache/text/{clothing_id}_prompt_embeds.pkl",
                                    device,
                                ),
                                "negative_prompt_embeds": executor.submit(
                                    download_s3_as_tensor,
                                    f"users/{user_id}/vton-cache/text/{clothing_id}_negative_prompt_embeds.pkl",
                                    device,
                                ),
                                "pooled_prompt_embeds": executor.submit(
                                    download_s3_as_tensor,
                                    f"users/{user_id}/vton-cache/text/{clothing_id}_pooled_prompt_embeds.pkl",
                                    device,
                                ),
                                "negative_pooled_prompt_embeds": executor.submit(
                                    download_s3_as_tensor,
                                    f"users/{user_id}/vton-cache/text/{clothing_id}_negative_pooled_prompt_embeds.pkl",
                                    device,
                                ),
                                "prompt_embeds_c": executor.submit(
                                    download_s3_as_tensor,
                                    f"users/{user_id}/vton-cache/text/{clothing_id}_prompt_embeds_c.pkl",
                                    device,
                                ),
                            }
                        )

                    # 결과 수집 및 캐시 저장
                    downloaded_data = {
                        key: future.result() for key, future in futures.items()
                    }
                    cache_data.update(downloaded_data)

                    # 메모리 캐시에 저장 (category별로 분리)
                    if not human_cached:
                        memory_cache[cache_key][user_id] = {
                            "human_img": downloaded_data["human_img"],
                            "mask": downloaded_data["mask"],
                            "mask_gray": downloaded_data["mask_gray"],
                            "pose_tensor": downloaded_data["pose_tensor"],
                        }
                        logger.info(
                            f"💾 Human {category} cache saved for user {user_id}"
                        )

                    if not garment_cached:
                        memory_cache["garment"][clothing_id] = {
                            "garm_img": downloaded_data["garm_img"],
                            "garm_tensor": downloaded_data["garm_tensor"],
                        }
                        logger.info(
                            f"💾 Garment cache saved for clothing {clothing_id}"
                        )

                    if not text_cached:
                        memory_cache["text"][clothing_id] = {
                            "prompt_embeds": downloaded_data["prompt_embeds"],
                            "negative_prompt_embeds": downloaded_data[
                                "negative_prompt_embeds"
                            ],
                            "pooled_prompt_embeds": downloaded_data[
                                "pooled_prompt_embeds"
                            ],
                            "negative_pooled_prompt_embeds": downloaded_data[
                                "negative_pooled_prompt_embeds"
                            ],
                            "prompt_embeds_c": downloaded_data["prompt_embeds_c"],
                        }
                        logger.info(f"💾 Text cache saved for clothing {clothing_id}")

            download_elapsed = time.time() - download_start
            logger.info(f"✅ S3 download completed in {download_elapsed:.2f}s")

            # Diffusion 생성
            result_img, diffusion_elapsed = generate_tryon_internal(
                human_img=cache_data["human_img"],
                mask=cache_data["mask"],
                mask_gray=cache_data["mask_gray"],
                pose_img_tensor=cache_data["pose_tensor"],
                garm_img=cache_data["garm_img"],
                garm_tensor=cache_data["garm_tensor"],
                prompt_embeds=cache_data["prompt_embeds"],
                negative_prompt_embeds=cache_data["negative_prompt_embeds"],
                pooled_prompt_embeds=cache_data["pooled_prompt_embeds"],
                negative_pooled_prompt_embeds=cache_data[
                    "negative_pooled_prompt_embeds"
                ],
                prompt_embeds_c=cache_data["prompt_embeds_c"],
                denoise_steps=request.denoise_steps,
                seed=request.seed,
            )

            total_elapsed = time.time() - start_time
            logger.info(
                f"🎉 Total: {total_elapsed:.2f}s (S3: {download_elapsed:.2f}s + Diffusion: {diffusion_elapsed:.2f}s)"
            )

            return VtonGenerateResponse(
                result_image_base64=pil_to_base64(result_img),
                processing_time=total_elapsed,
            )

    except Exception as e:
        logger.error(f"[generate-tryon-v2] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/vton/generate-batch", response_model=VtonBatchGenerateResponse)
async def generate_batch(request: VtonBatchGenerateRequest):
    """
    배치 처리: 한 사용자가 여러 옷을 동시에 입어보기

    GPU 메모리가 허용하는 한 여러 옷을 배치로 처리
    """
    try:
        logger.info(
            f"[generate-batch] user_id={request.user_id}, {len(request.clothing_ids)} items"
        )
        start_time = time.time()

        results = []

        # 사람 캐시는 한 번만 로드
        logger.info("Loading human cache...")
        user_id = request.user_id

        human_img = download_s3_as_pil(f"users/{user_id}/vton-cache/human_img.png")
        mask = download_s3_as_pil(f"users/{user_id}/vton-cache/mask.png")
        mask_gray = download_s3_as_pil(f"users/{user_id}/vton-cache/mask_gray.png")
        pose_tensor = download_s3_as_tensor(
            f"users/{user_id}/vton-cache/pose_tensor.pkl", device
        )

        # 각 옷에 대해 순차 처리 (배치 처리는 메모리 제약으로 순차)
        for clothing_id in request.clothing_ids:
            try:
                item_start = time.time()
                logger.info(f"Processing clothing_id={clothing_id}")

                # 옷 캐시 로드
                garm_img = download_s3_as_pil(
                    f"users/{user_id}/vton-cache/garments/{clothing_id}_img.png"
                )
                garm_tensor = download_s3_as_tensor(
                    f"users/{user_id}/vton-cache/garments/{clothing_id}_tensor.pkl",
                    device,
                )
                prompt_embeds = download_s3_as_tensor(
                    f"users/{user_id}/vton-cache/text/{clothing_id}_prompt_embeds.pkl",
                    device,
                )
                negative_prompt_embeds = download_s3_as_tensor(
                    f"users/{user_id}/vton-cache/text/{clothing_id}_negative_prompt_embeds.pkl",
                    device,
                )
                pooled_prompt_embeds = download_s3_as_tensor(
                    f"users/{user_id}/vton-cache/text/{clothing_id}_pooled_prompt_embeds.pkl",
                    device,
                )
                negative_pooled_prompt_embeds = download_s3_as_tensor(
                    f"users/{user_id}/vton-cache/text/{clothing_id}_negative_pooled_prompt_embeds.pkl",
                    device,
                )
                prompt_embeds_c = download_s3_as_tensor(
                    f"users/{user_id}/vton-cache/text/{clothing_id}_prompt_embeds_c.pkl",
                    device,
                )

                # Diffusion 생성
                result_img, _ = generate_tryon_internal(
                    human_img=human_img,
                    mask=mask,
                    mask_gray=mask_gray,
                    pose_img_tensor=pose_tensor,
                    garm_img=garm_img,
                    garm_tensor=garm_tensor,
                    prompt_embeds=prompt_embeds,
                    negative_prompt_embeds=negative_prompt_embeds,
                    pooled_prompt_embeds=pooled_prompt_embeds,
                    negative_pooled_prompt_embeds=negative_pooled_prompt_embeds,
                    prompt_embeds_c=prompt_embeds_c,
                    denoise_steps=request.denoise_steps,
                    seed=request.seed,
                )

                item_elapsed = time.time() - item_start

                results.append(
                    {
                        "clothing_id": clothing_id,
                        "result_image_base64": pil_to_base64(result_img),
                        "processing_time": item_elapsed,
                        "success": True,
                    }
                )

                logger.info(
                    f"✅ clothing_id={clothing_id} completed in {item_elapsed:.2f}s"
                )

            except Exception as item_error:
                logger.error(f"❌ clothing_id={clothing_id} failed: {item_error}")
                results.append(
                    {
                        "clothing_id": clothing_id,
                        "result_image_base64": "",
                        "processing_time": 0,
                        "success": False,
                        "error": str(item_error),
                    }
                )

        total_elapsed = time.time() - start_time
        logger.info(
            f"🎉 Batch processing completed: {len(results)} items in {total_elapsed:.2f}s"
        )

        return VtonBatchGenerateResponse(
            results=results, total_processing_time=total_elapsed
        )

    except Exception as e:
        logger.error(f"[generate-batch] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# 캐시 관리 엔드포인트
# ============================================================================


@app.post("/cache/warmup")
async def warmup_user_cache(request: dict):
    """
    사용자 로그인 시 모든 데이터를 메모리에 미리 로드 (Warm-up)

    Request body:
    {
        "user_id": "uuid",
        "clothing_ids": ["uuid1", "uuid2", ...]
    }
    """
    user_id = request.get("user_id")
    clothing_ids = request.get("clothing_ids", [])

    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    logger.info(
        f"🔥 Warming up cache for user {user_id} with {len(clothing_ids)} clothing items"
    )
    start_time = time.time()

    import concurrent.futures

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            futures = {}

            # 1. Human 데이터 로드 (아직 캐시에 없으면)
            if user_id not in memory_cache["human"]:
                logger.info(f"📥 Loading human data for user {user_id}")
                futures.update(
                    {
                        "human_img": executor.submit(
                            download_s3_as_pil,
                            f"users/{user_id}/vton-cache/human_img.png",
                        ),
                        "mask": executor.submit(
                            download_s3_as_pil, f"users/{user_id}/vton-cache/mask.png"
                        ),
                        "mask_gray": executor.submit(
                            download_s3_as_pil,
                            f"users/{user_id}/vton-cache/mask_gray.png",
                        ),
                        "pose_tensor": executor.submit(
                            download_s3_as_tensor,
                            f"users/{user_id}/vton-cache/pose_tensor.pkl",
                            device,
                        ),
                    }
                )

            # 2. 모든 Garment & Text 데이터 로드
            for clothing_id in clothing_ids:
                # Garment 데이터
                if clothing_id not in memory_cache["garment"]:
                    futures[f"garm_img_{clothing_id}"] = executor.submit(
                        download_s3_as_pil,
                        f"users/{user_id}/vton-cache/garments/{clothing_id}_img.png",
                    )
                    futures[f"garm_tensor_{clothing_id}"] = executor.submit(
                        download_s3_as_tensor,
                        f"users/{user_id}/vton-cache/garments/{clothing_id}_tensor.pkl",
                        device,
                    )

                # Text 데이터
                if clothing_id not in memory_cache["text"]:
                    futures[f"prompt_embeds_{clothing_id}"] = executor.submit(
                        download_s3_as_tensor,
                        f"users/{user_id}/vton-cache/text/{clothing_id}_prompt_embeds.pkl",
                        device,
                    )
                    futures[f"negative_prompt_embeds_{clothing_id}"] = executor.submit(
                        download_s3_as_tensor,
                        f"users/{user_id}/vton-cache/text/{clothing_id}_negative_prompt_embeds.pkl",
                        device,
                    )
                    futures[f"pooled_prompt_embeds_{clothing_id}"] = executor.submit(
                        download_s3_as_tensor,
                        f"users/{user_id}/vton-cache/text/{clothing_id}_pooled_prompt_embeds.pkl",
                        device,
                    )
                    futures[f"negative_pooled_prompt_embeds_{clothing_id}"] = (
                        executor.submit(
                            download_s3_as_tensor,
                            f"users/{user_id}/vton-cache/text/{clothing_id}_negative_pooled_prompt_embeds.pkl",
                            device,
                        )
                    )
                    futures[f"prompt_embeds_c_{clothing_id}"] = executor.submit(
                        download_s3_as_tensor,
                        f"users/{user_id}/vton-cache/text/{clothing_id}_prompt_embeds_c.pkl",
                        device,
                    )

            # 모든 다운로드 완료 대기
            downloaded_data = {}
            failed_items = []

            for key, future in futures.items():
                try:
                    downloaded_data[key] = future.result()
                except Exception as e:
                    logger.warning(f"⚠️  Failed to load {key}: {e}")
                    failed_items.append(key)

            # 3. 메모리 캐시에 저장
            # Human 캐시
            if "human_img" in downloaded_data:
                memory_cache["human"][user_id] = {
                    "human_img": downloaded_data["human_img"],
                    "mask": downloaded_data["mask"],
                    "mask_gray": downloaded_data["mask_gray"],
                    "pose_tensor": downloaded_data["pose_tensor"],
                }
                logger.info(f"✅ Human cache saved for user {user_id}")

            # Garment & Text 캐시
            for clothing_id in clothing_ids:
                # Garment
                garm_img_key = f"garm_img_{clothing_id}"
                garm_tensor_key = f"garm_tensor_{clothing_id}"

                if (
                    garm_img_key in downloaded_data
                    and garm_tensor_key in downloaded_data
                ):
                    memory_cache["garment"][clothing_id] = {
                        "garm_img": downloaded_data[garm_img_key],
                        "garm_tensor": downloaded_data[garm_tensor_key],
                    }
                    logger.info(f"✅ Garment cache saved for clothing {clothing_id}")

                # Text
                text_keys = [
                    f"prompt_embeds_{clothing_id}",
                    f"negative_prompt_embeds_{clothing_id}",
                    f"pooled_prompt_embeds_{clothing_id}",
                    f"negative_pooled_prompt_embeds_{clothing_id}",
                    f"prompt_embeds_c_{clothing_id}",
                ]

                if all(key in downloaded_data for key in text_keys):
                    memory_cache["text"][clothing_id] = {
                        "prompt_embeds": downloaded_data[
                            f"prompt_embeds_{clothing_id}"
                        ],
                        "negative_prompt_embeds": downloaded_data[
                            f"negative_prompt_embeds_{clothing_id}"
                        ],
                        "pooled_prompt_embeds": downloaded_data[
                            f"pooled_prompt_embeds_{clothing_id}"
                        ],
                        "negative_pooled_prompt_embeds": downloaded_data[
                            f"negative_pooled_prompt_embeds_{clothing_id}"
                        ],
                        "prompt_embeds_c": downloaded_data[
                            f"prompt_embeds_c_{clothing_id}"
                        ],
                    }
                    logger.info(f"✅ Text cache saved for clothing {clothing_id}")

        elapsed = time.time() - start_time

        return {
            "success": True,
            "message": "Cache warmed up successfully",
            "user_id": user_id,
            "loaded_clothing_count": len(clothing_ids),
            "failed_items": failed_items,
            "elapsed_seconds": round(elapsed, 2),
            "cached_humans": len(memory_cache["human"]),
            "cached_garments": len(memory_cache["garment"]),
            "cached_texts": len(memory_cache["text"]),
        }

    except Exception as e:
        logger.error(f"❌ Warmup failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/cache/human/{user_id}")
def clear_human_cache(user_id: str):
    """특정 사용자의 human 캐시 삭제 (upper & lower)"""
    cleared = False

    # upper_body 캐시 삭제
    if "human_upper" in memory_cache and user_id in memory_cache["human_upper"]:
        del memory_cache["human_upper"][user_id]
        logger.info(f"✅ Cleared human_upper cache for {user_id}")
        cleared = True

    # lower_body 캐시 삭제
    if "human_lower" in memory_cache and user_id in memory_cache["human_lower"]:
        del memory_cache["human_lower"][user_id]
        logger.info(f"✅ Cleared human_lower cache for {user_id}")
        cleared = True

    # 구버전 캐시도 확인 (있다면 삭제)
    if "human" in memory_cache and user_id in memory_cache["human"]:
        del memory_cache["human"][user_id]
        logger.info(f"✅ Cleared legacy human cache for {user_id}")
        cleared = True

    if cleared:
        return {
            "success": True,
            "message": f"Human cache (upper & lower) cleared for {user_id}",
        }
    return {"success": False, "message": "Cache not found"}


@app.delete("/cache/garment/{clothing_id}")
def clear_garment_cache(clothing_id: str):
    """특정 옷의 garment 캐시 삭제"""
    if clothing_id in memory_cache["garment"]:
        del memory_cache["garment"][clothing_id]
    if clothing_id in memory_cache["text"]:
        del memory_cache["text"][clothing_id]
    return {
        "success": True,
        "message": f"Garment & text cache cleared for {clothing_id}",
    }


@app.delete("/cache/all")
def clear_all_cache():
    """모든 캐시 삭제"""
    memory_cache["human_upper"].clear()
    memory_cache["human_lower"].clear()
    memory_cache["garment"].clear()
    memory_cache["text"].clear()
    # 구버전 캐시도 삭제
    if "human" in memory_cache:
        memory_cache["human"].clear()
    return {
        "success": True,
        "message": "All cache cleared (upper, lower, garment, text)",
        "cached_humans_upper": 0,
        "cached_humans_lower": 0,
        "cached_garments": 0,
        "cached_texts": 0,
    }


# ============================================================================
# GPU 최적화 적용
# ============================================================================


def apply_gpu_optimizations():
    """GPU 최적화 적용"""
    global GPU_OPTIMIZATIONS_ENABLED, device
    global torch
    # Device 명시적 설정
    device_str = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"📍 Using device: {device_str}")

    logger.info("=" * 80)
    logger.info("🚀 Applying GPU Optimizations...")
    logger.info("=" * 80)

    try:
        # 0. 파이프라인을 GPU로 이동 (float16 사용)
        logger.info("0️⃣ Moving pipeline to GPU (float16)...")
        pipe.to(device)
        logger.info(f"✅ Pipeline moved to {device}")

        # 1. Enable cuDNN benchmark for faster convolutions
        if torch.cuda.is_available():
            torch.backends.cudnn.benchmark = True
            logger.info("✅ cuDNN benchmark enabled")

        # 2. Enable TF32 for faster matmul on Ampere GPUs
        if torch.cuda.is_available():
            torch.backends.cuda.matmul.allow_tf32 = True
            torch.backends.cudnn.allow_tf32 = True
            logger.info("✅ TF32 enabled")

        # 3. Attention slicing - 비활성화 (성능 저하 가능성)
        # try:
        #     pipe.enable_attention_slicing(1)
        #     logger.info("✅ Attention slicing enabled")
        # except Exception as e:
        #     logger.warning(f"⚠️  Attention slicing not available: {e}")
        logger.info("⚠️  Attention slicing disabled (may slow down inference)")

        # 4. VAE slicing - 유지 (디코딩 속도 개선)
        try:
            pipe.vae.enable_slicing()
            logger.info("✅ VAE slicing enabled")
        except Exception as e:
            logger.warning(f"⚠️  VAE slicing not available: {e}")

        # 5. channels_last - 비활성화 (호환성 문제 가능성)
        # try:
        #     pipe.unet.to(memory_format=torch.channels_last)
        #     logger.info("✅ UNet channels_last memory format enabled")
        # except Exception as e:
        #     logger.warning(f"⚠️  channels_last not available: {e}")
        logger.info("⚠️  UNet channels_last disabled (compatibility issues)")

        # 6. torch.compile 비활성화 - 첫 실행이 너무 느림 (30초~1분)
        # try:
        #     import torch._dynamo
        #     torch._dynamo.config.suppress_errors = True
        #     pipe.unet = torch.compile(
        #         pipe.unet, mode="reduce-overhead", fullgraph=False
        #     )
        #     logger.info("✅ UNet compiled with torch.compile")
        # except Exception as e:
        #     logger.warning(f"⚠️  torch.compile not available: {e}")
        logger.info("⚠️  torch.compile disabled (too slow on first run)")

        GPU_OPTIMIZATIONS_ENABLED = True
        logger.info("=" * 80)
        logger.info("🎉 GPU Optimizations Applied Successfully!")
        logger.info("=" * 80)

    except Exception as e:
        logger.error(f"❌ GPU optimization failed: {e}", exc_info=True)
        logger.warning("⚠️  Continuing without optimizations...")


# ============================================================================
# 서버 실행
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("VTON_PORT", "8001"))

    logger.info("=" * 80)
    logger.info("✅ IDM-VTON Models Loaded Successfully!")
    logger.info(f"🚀 Starting FastAPI server on port {port}...")
    logger.info("Production mode: S3-based caching (no memory cache)")
    logger.info("=" * 80)

    # GPU 최적화 적용
    apply_gpu_optimizations()

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info",
        timeout_keep_alive=75,  # Keep-alive 타임아웃 증가
        backlog=100,  # 대기열 크기 증가 (큐잉 지원)
    )
