#!/usr/bin/env python3
"""
AI 모델 다운로드 스크립트

이 스크립트는 ai-fastapi 서버 실행에 필요한 모델 체크포인트를 다운로드합니다.
처음 프로젝트를 클론한 후 한 번 실행하세요.

사용법:
    python download_models.py
"""

import os
import sys
from pathlib import Path

def download_models():
    """필요한 모든 모델을 다운로드합니다."""
    
    # huggingface_hub 설치 확인
    try:
        from huggingface_hub import hf_hub_download
    except ImportError:
        print("huggingface_hub 패키지를 설치합니다...")
        os.system(f"{sys.executable} -m pip install huggingface_hub")
        from huggingface_hub import hf_hub_download
    
    # checkpoints 디렉토리 생성
    checkpoints_dir = Path(__file__).parent / "checkpoints"
    checkpoints_dir.mkdir(exist_ok=True)
    
    yolov8n_clothing_dir = checkpoints_dir / "yolov8n-clothing"
    yolov8n_clothing_dir.mkdir(exist_ok=True)
    
    print("=" * 60)
    print("AI 모델 다운로드 시작")
    print("=" * 60)
    
    # 1. yolov8n-clothing-detection (Stage 1: 의류/신발/가방/액세서리 분류)
    model1_path = yolov8n_clothing_dir / "best.pt"
    if model1_path.exists():
        print(f"\n[1/3] ✅ yolov8n-clothing-detection 이미 존재: {model1_path}")
    else:
        print(f"\n[1/3] 📥 yolov8n-clothing-detection 다운로드 중...")
        try:
            hf_hub_download(
                repo_id="kesimeg/yolov8n-clothing-detection",
                filename="best.pt",
                local_dir=str(yolov8n_clothing_dir),
                local_dir_use_symlinks=False
            )
            print(f"      ✅ 다운로드 완료: {model1_path}")
        except Exception as e:
            print(f"      ❌ 다운로드 실패: {e}")
    
    # 2. deepfashion2_yolov8s-seg (Stage 2: 의류 상세 분류)
    model2_path = checkpoints_dir / "deepfashion2_yolov8s-seg.pt"
    if model2_path.exists():
        print(f"\n[2/3] ✅ deepfashion2_yolov8s-seg 이미 존재: {model2_path}")
    else:
        print(f"\n[2/3] 📥 deepfashion2_yolov8s-seg 다운로드 중...")
        try:
            # Hugging Face에서 다운로드 시도
            hf_hub_download(
                repo_id="kesimeg/deepfashion2_yolov8s-seg",
                filename="deepfashion2_yolov8s-seg.pt",
                local_dir=str(checkpoints_dir),
                local_dir_use_symlinks=False
            )
            print(f"      ✅ 다운로드 완료: {model2_path}")
        except Exception as e:
            print(f"      ⚠️  Hugging Face에서 다운로드 실패: {e}")
            print(f"      📝 수동 다운로드 필요:")
            print(f"         https://huggingface.co 에서 deepfashion2_yolov8s-seg.pt 를 검색하여")
            print(f"         {model2_path} 에 저장하세요.")
    
    # 3. SAM2 (세그멘테이션)
    model3_path = checkpoints_dir / "sam2_hiera_large.pt"
    if model3_path.exists():
        print(f"\n[3/3] ✅ sam2_hiera_large 이미 존재: {model3_path}")
    else:
        print(f"\n[3/3] 📥 sam2_hiera_large 다운로드 중... (약 857MB, 시간이 걸립니다)")
        try:
            hf_hub_download(
                repo_id="facebook/sam2-hiera-large",
                filename="sam2_hiera_large.pt",
                local_dir=str(checkpoints_dir),
                local_dir_use_symlinks=False
            )
            print(f"      ✅ 다운로드 완료: {model3_path}")
        except Exception as e:
            print(f"      ❌ 다운로드 실패: {e}")
            print(f"      📝 수동 다운로드:")
            print(f"         https://huggingface.co/facebook/sam2-hiera-large")
            print(f"         에서 sam2_hiera_large.pt 를 다운로드하여")
            print(f"         {model3_path} 에 저장하세요.")
    
    print("\n" + "=" * 60)
    print("다운로드 완료!")
    print("=" * 60)
    
    # 모델 상태 확인
    print("\n📋 모델 상태:")
    models = [
        ("yolov8n-clothing (Stage 1)", model1_path),
        ("deepfashion2_yolov8s-seg (Stage 2)", model2_path),
        ("sam2_hiera_large (세그멘테이션)", model3_path),
    ]
    
    all_ready = True
    for name, path in models:
        if path.exists():
            size_mb = path.stat().st_size / (1024 * 1024)
            print(f"   ✅ {name}: {size_mb:.1f} MB")
        else:
            print(f"   ❌ {name}: 없음")
            all_ready = False
    
    if all_ready:
        print("\n🎉 모든 모델이 준비되었습니다! ai-fastapi 서버를 시작할 수 있습니다.")
    else:
        print("\n⚠️  일부 모델이 누락되었습니다. 위의 안내에 따라 수동으로 다운로드하세요.")

if __name__ == "__main__":
    download_models()
