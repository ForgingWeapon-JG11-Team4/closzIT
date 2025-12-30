# Analysis Workflow 및 AI 통합 결과

## 🚀 FastAPI 실행 (SAM2 토글)

| 환경 | 명령어 | 분석 속도 |
|------|--------|----------|
| **개발용 (SAM2 끔)** | `uvicorn main:app --reload` | ~10-15초 |
| **배포용 (SAM2 켬)** | `$env:USE_SAM2="true"; uvicorn main:app --reload` | ~44초 (GPU시 ~5초) |

> 기본값: `USE_SAM2=false` (단순 크롭, 배경 제거 없음)

---

## 구현 요약
1.  **Analysis 워크플로우**:
    -   `AnalysisModule`, `AnalysisService`, `AnalysisController` 구현.
    -   `POST /analysis`: 이미지 업로드 시 FastAPI(`/analyze-all`) 호출.
    -   **병렬 처리**: Bedrock 라벨링 (Claude 4.5)과 DB 임베딩 저장(`PENDING`)을 동시에 수행.
    -   **즉시 반환**: DB 저장 완료 후, AI 라벨링 결과를 `confirm` 전 단계 데이터로 클라이언트에 반환.
    -   `PATCH /analysis/:id/confirm`: 사용자 검토 후 최종 데이터 업데이트 및 상태(`COMPLETED`) 변경.

2.  **AI & Bedrock**:
    -   **Claude 4.5 Sonnet (Tokyo Region)**: `ap-northeast-1` 리전 사용 설정.
    -   **프롬프트 강화**: `TPO` (Time, Place, Occasion) 및 `Season` (계절) 정보 추출 로직 추가.

3.  **데이터베이스 (Prisma)**:
    -   **Schema 변경**: `status`, `tpo`, `season` 컬럼 추가.
    -   **Vector Storage**: `pgvector`를 위한 `embedding` 저장 로직에 `$queryRaw` 활용.

## 테스트 방법
1.  **이미지 분석 요청**:
    ```http
    POST http://localhost:3000/analysis
    Content-Type: multipart/form-data; boundary=...
    
    (file 파일 첨부)
    ```
2.  **단일 항목 확정**:
    ```http
    PATCH http://localhost:3000/analysis/{id}/confirm
    Content-Type: application/json
    
    {
      "category": "Top",
      "sub_category": "Shirt",
      "tpo": ["Date", "Daily"],
      "season": ["Spring", "Autumn"],
      "colors": ["White"],
      ...
    }
    ```

## 중요 사항
-   `.env` 파일에 `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` 및 `FASTAPI_URL`을 반드시 설정해야 합니다.
-   FastAPI 서버가 `http://localhost:8000`에서 실행 중이어야 합니다.
