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

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# S3 클라이언트 초기화
s3_client = boto3.client(
    "s3",
    region_name=os.getenv("AWS_REGION", "ap-northeast-2"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)
S3_BUCKET = os.getenv("AWS_S3_BUCKET", "your-bucket-name")

# FastAPI 앱 생성
app = FastAPI(title="IDM-VTON API Server", version="2.0.0")

# GPU 최적화 플래그
GPU_OPTIMIZATIONS_ENABLED = False

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
    denoise_steps: int = 20
    seed: int = 42


class VtonBatchGenerateRequest(BaseModel):
    """배치 처리용 - 여러 옷을 동시에 입어보기"""

    user_id: str
    clothing_ids: list[str]  # 여러 옷 ID
    denoise_steps: int = 20
    seed: int = 42


class VtonBatchGenerateResponse(BaseModel):
    results: list[dict]  # [{clothing_id, result_image_base64, processing_time}, ...]
    total_processing_time: float


class HumanPreprocessResponse(BaseModel):
    user_id: str
    processing_time: float
    message: str
    human_img: str  # base64
    mask: str  # base64
    mask_gray: str  # base64
    pose_img_tensor: str  # base64 (pickled tensor)


class GarmentPreprocessRequest(BaseModel):
    user_id: str  # UUID
    clothing_id: str  # UUID
    image_base64: str


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
    denoise_steps: int = 20
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
    return tensor.to(device_name, torch.float16)


# ============================================================================
# 전처리 함수
# ============================================================================


def preprocess_human_internal(human_img: Image.Image) -> dict:
    """
    사람 이미지 전처리: OpenPose + Parsing + DensePose

    Returns:
        {
            'human_img': base64,
            'mask': base64,
            'mask_gray': base64,
            'pose_img_tensor': base64 (pickled tensor)
        }
    """
    logger.info("⏳ Preprocessing human image...")
    start = time.time()

    if isinstance(human_img, np.ndarray):
        human_img = Image.fromarray(human_img)

    human_img = human_img.convert("RGB").resize((768, 1024))
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
    mask, mask_gray = get_mask_location("hd", "upper_body", model_parse, keypoints)
    mask = mask.resize((768, 1024))

    # DensePose
    pose_img = args.func(args, human_img_arg)
    pose_img = pose_img[:, :, ::-1]
    pose_img = Image.fromarray(pose_img).resize((768, 1024))
    pose_img_tensor = tensor_transfrom(pose_img).unsqueeze(0).to(device, torch.float16)

    elapsed = time.time() - start
    logger.info(f"✅ Human preprocessing completed in {elapsed:.2f}s")

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

    garm_img = garm_img.convert("RGB").resize((768, 1024))
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

    # 카테고리만 사용 (첫 1-2개 단어)
    garment_des_parts = garment_des.split()

    # 첫 2개 단어까지만 사용 (예: "Outer Jacket" → 카테고리 정보만)
    # 너무 구체적인 설명(색상, 디테일 등)은 제외
    category_words = garment_des_parts[:2] if len(garment_des_parts) >= 2 else garment_des_parts[:1]
    category = " ".join(category_words) if category_words else garment_des

    prompt = "model wearing " + category
    prompt_c = "a photo of " + category
    negative_prompt = "monochrome, lowres, bad anatomy, worst quality, low quality"

    # 📝 생성될 프롬프트 출력
    print("=" * 80)
    print("📝 Text Embedding Prompts:")
    print(f"  📥 Original description: '{garment_des}'")
    print(f"  🎯 Using first word only: '{first_word}'")
    print(f"  ✅ Positive prompt: '{prompt}'")
    print(f"  ✅ Condition prompt: '{prompt_c}'")
    print(f"  ❌ Negative prompt: '{negative_prompt}'")
    print("=" * 80)

    with torch.no_grad():
        pipe.to(device)
        original_dtype = pipe.text_encoder.dtype
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

        pipe.text_encoder.to(original_dtype)
        pipe.text_encoder_2.to(original_dtype)
        pipe.to(device)

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
    logger.info("⚡ Generating try-on with diffusion...")
    start = time.time()

    # Device 명시적 설정 (CUDA 사용)
    device_str = "cuda" if torch.cuda.is_available() else "cpu"

    with torch.no_grad():
        generator = torch.Generator(device_str).manual_seed(int(seed))

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
        )[0]

    elapsed = time.time() - start
    logger.info(f"⚡ Diffusion completed in {elapsed:.2f}s")

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
    return {"status": "healthy", "models_loaded": True, "caching": "S3-based"}


@app.post("/vton/preprocess-human", response_model=HumanPreprocessResponse)
async def preprocess_human(request: HumanPreprocessRequest):
    """
    사람 이미지 전처리: OpenPose + Parsing + DensePose

    NestJS가 결과를 받아서 S3에 저장:
    - users/{user_id}/vton-cache/human_img.png
    - users/{user_id}/vton-cache/mask.png
    - users/{user_id}/vton-cache/mask_gray.png
    - users/{user_id}/vton-cache/pose_tensor.pkl
    """
    try:
        logger.info(f"[preprocess-human] user_id={request.user_id}")

        # Base64 → PIL
        human_img = base64_to_pil(request.image_base64)

        # 전처리
        result = preprocess_human_internal(human_img)

        # NestJS가 S3에 업로드할 데이터 반환
        return HumanPreprocessResponse(
            user_id=request.user_id,
            processing_time=result["elapsed"],
            message="Preprocessing completed",
            human_img=result["human_img"],
            mask=result["mask"],
            mask_gray=result["mask_gray"],
            pose_img_tensor=result["pose_img_tensor"],
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
async def generate_tryon(request: VtonGenerateRequest):
    """
    캐시된 S3 데이터로 Diffusion 실행 (레거시 버전)

    NestJS가 S3에서 캐시 데이터를 다운로드해서 전달:
    - human_img, mask, mask_gray, pose_tensor
    - garm_img, garm_tensor
    - text embeddings
    """
    try:
        logger.info(
            f"[generate-tryon] user_id={request.user_id}, clothing_id={request.clothing_id}"
        )

        # Base64 → PIL Images
        human_img = base64_to_pil(request.human_img)
        mask = base64_to_pil(request.mask)
        mask_gray = base64_to_pil(request.mask_gray)
        garm_img = base64_to_pil(request.garm_img)

        # ⭐ CRITICAL: 명시적으로 CUDA 사용
        device_str = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"[generate-tryon] Using device: {device_str}")

        # Base64 → PyTorch Tensors (pickled)
        pose_img_tensor = base64_to_tensor(request.pose_tensor, device_str)
        garm_tensor = base64_to_tensor(request.garm_tensor, device_str)
        prompt_embeds = base64_to_tensor(request.prompt_embeds, device_str)
        negative_prompt_embeds = base64_to_tensor(
            request.negative_prompt_embeds, device_str
        )
        pooled_prompt_embeds = base64_to_tensor(request.pooled_prompt_embeds, device_str)
        negative_pooled_prompt_embeds = base64_to_tensor(
            request.negative_pooled_prompt_embeds, device_str
        )
        prompt_embeds_c = base64_to_tensor(request.prompt_embeds_c, device_str)

        # Diffusion 생성
        result_img, elapsed = generate_tryon_internal(
            human_img=human_img,
            mask=mask,
            mask_gray=mask_gray,
            pose_img_tensor=pose_img_tensor,
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

        return VtonGenerateResponse(
            result_image_base64=pil_to_base64(result_img), processing_time=elapsed
        )

    except Exception as e:
        logger.error(f"[generate-tryon] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/vton/generate-tryon-v2", response_model=VtonGenerateResponse)
async def generate_tryon_v2(request: VtonGenerateRequestV2):
    """
    최적화 버전: FastAPI가 S3에서 직접 다운로드

    이점:
    - NestJS → FastAPI HTTP 전송 제거
    - S3 다운로드 병렬 처리
    - 예상 2-3초 단축
    """
    try:
        logger.info(
            f"[generate-tryon-v2] user_id={request.user_id}, clothing_id={request.clothing_id}"
        )
        start_time = time.time()

        # S3에서 캐시 데이터 병렬 다운로드
        logger.info("⚡ Downloading cache from S3...")
        download_start = time.time()

        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor(max_workers=11) as executor:
            # S3 Key 생성
            user_id = request.user_id
            clothing_id = request.clothing_id

            futures = {
                "human_img": executor.submit(
                    download_s3_as_pil, f"users/{user_id}/vton-cache/human_img.png"
                ),
                "mask": executor.submit(
                    download_s3_as_pil, f"users/{user_id}/vton-cache/mask.png"
                ),
                "mask_gray": executor.submit(
                    download_s3_as_pil, f"users/{user_id}/vton-cache/mask_gray.png"
                ),
                "pose_tensor": executor.submit(
                    download_s3_as_tensor,
                    f"users/{user_id}/vton-cache/pose_tensor.pkl",
                    device,
                ),
                "garm_img": executor.submit(
                    download_s3_as_pil,
                    f"users/{user_id}/vton-cache/garments/{clothing_id}_img.png",
                ),
                "garm_tensor": executor.submit(
                    download_s3_as_tensor,
                    f"users/{user_id}/vton-cache/garments/{clothing_id}_tensor.pkl",
                    device,
                ),
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

            # 결과 수집
            cache_data = {key: future.result() for key, future in futures.items()}

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
            negative_pooled_prompt_embeds=cache_data["negative_pooled_prompt_embeds"],
            prompt_embeds_c=cache_data["prompt_embeds_c"],
            denoise_steps=request.denoise_steps,
            seed=request.seed,
        )

        total_elapsed = time.time() - start_time
        logger.info(
            f"🎉 Total: {total_elapsed:.2f}s (S3: {download_elapsed:.2f}s + Diffusion: {diffusion_elapsed:.2f}s)"
        )

        return VtonGenerateResponse(
            result_image_base64=pil_to_base64(result_img), processing_time=total_elapsed
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
# GPU 최적화 적용
# ============================================================================


def apply_gpu_optimizations():
    """GPU 최적화 적용"""
    global GPU_OPTIMIZATIONS_ENABLED, device

    # Device 명시적 설정
    device_str = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"📍 Using device: {device_str}")

    logger.info("=" * 80)
    logger.info("🚀 Applying GPU Optimizations...")
    logger.info("=" * 80)

    try:
        # 0. 파이프라인을 GPU로 이동 (가장 중요!)
        logger.info("0️⃣ Moving pipeline to GPU...")
        pipe.to(device)
        logger.info(f"✅ Pipeline moved to {device}")
        # 1. xFormers 메모리 효율적 어텐션
        logger.info("1️⃣ Enabling xFormers memory efficient attention...")
        try:
            pipe.enable_xformers_memory_efficient_attention()
            logger.info("✅ xFormers enabled")
        except Exception as e:
            logger.warning(f"⚠️  xFormers not available: {e}")

        # 2. Torch Compile (PyTorch 2.0+)
        logger.info("2️⃣ Applying torch.compile...")
        try:
            if hasattr(torch, "compile"):
                # UNet만 컴파일 (가장 연산 집약적)
                pipe.unet = torch.compile(pipe.unet, mode="reduce-overhead")
                logger.info("✅ torch.compile applied to UNet")
            else:
                logger.warning("⚠️  torch.compile not available (PyTorch < 2.0)")
        except Exception as e:
            logger.warning(f"⚠️  torch.compile failed: {e}")

        # 3. Channels Last Memory Format (더 빠른 Convolution)
        logger.info("3️⃣ Setting channels_last memory format...")
        try:
            pipe.unet.to(memory_format=torch.channels_last)
            logger.info("✅ Channels last format applied")
        except Exception as e:
            logger.warning(f"⚠️  Channels last failed: {e}")

        # 4. CUDA Graphs & Warmup (더 빠른 실행)
        logger.info("4️⃣ Running warmup inference (reduces first request latency)...")
        try:
            with torch.no_grad():
                # 실제 입어보기와 동일한 크기의 더미 데이터 생성
                dummy_human_img = Image.new("RGB", (768, 1024))
                dummy_garm_img = Image.new("RGB", (768, 1024))
                dummy_mask = Image.new("RGB", (768, 1024))

                # Tensor 변환 (device_str 사용)
                dummy_human_tensor = (
                    tensor_transfrom(dummy_human_img)
                    .unsqueeze(0)
                    .to(device_str, torch.float16)
                )
                dummy_garm_tensor = (
                    tensor_transfrom(dummy_garm_img.resize((384, 512)))
                    .unsqueeze(0)
                    .to(device_str, torch.float16)
                )
                dummy_mask_tensor = (
                    tensor_transfrom(dummy_mask).unsqueeze(0).to(device_str, torch.float16)
                )

                # 더미 텍스트 임베딩
                dummy_prompt_embeds = torch.randn(
                    1, 77, 2048, device=device_str, dtype=torch.float16
                )
                dummy_pooled_embeds = torch.randn(
                    1, 2048, device=device_str, dtype=torch.float16
                )

                logger.info("   Running warmup diffusion (5 steps)...")
                # 짧은 warmup 실행 (5 steps만)
                pipe(
                    prompt_embeds=dummy_prompt_embeds,
                    negative_prompt_embeds=dummy_prompt_embeds,
                    pooled_prompt_embeds=dummy_pooled_embeds,
                    negative_pooled_prompt_embeds=dummy_pooled_embeds,
                    num_inference_steps=5,  # 빠른 warmup
                    guidance_scale=2.0,
                    image=dummy_human_img,
                    mask_image=dummy_mask,
                    image_embeds=dummy_garm_tensor,
                    pose_img=dummy_human_tensor,
                    height=1024,
                    width=768,
                )
                logger.info("✅ Warmup completed - CUDA kernels compiled and cached")
        except Exception as e:
            logger.warning(f"⚠️  Warmup failed: {e}")
            logger.warning("   First inference will be slower due to JIT compilation")

        # 5. cuDNN Benchmark
        logger.info("5️⃣ Enabling cuDNN benchmarking...")
        torch.backends.cudnn.benchmark = True
        logger.info("✅ cuDNN benchmark enabled")

        # 6. TF32 활성화 (Ampere GPU 이상)
        logger.info("6️⃣ Enabling TF32 precision...")
        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.allow_tf32 = True
        logger.info("✅ TF32 enabled")

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

    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
