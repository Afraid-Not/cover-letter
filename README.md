# Cover Letter Generator

합격 자소서 기반 RAG + 9명 AI 평가관 자소서 생성 풀스택 앱

## 주요 기능

- **자소서 자동 생성** — 합격 자소서 136건 RAG 기반, 사람이 쓴 것처럼 자연스러운 문체
- **9명 AI 평가관** — HR 인사담당자 3명 + 현업 팀장 3명 + 채용 리더 3명이 실시간 SSE 스트리밍으로 평가
- **채용공고 분석** — 텍스트 복붙 또는 스크린샷 업로드 (GPT-4o Vision)
- **이력서 관리** — PDF/텍스트 업로드, 파싱 후 Supabase에 저장하여 재사용
- **일반 자소서 / 질문 답변** 모드 지원
- **피드백 반영 재생성** — 평가 결과 기반 자동 개선
- **생성 이력** — DB 저장 + 다시보기

## 기술 스택

| 구분       | 기술                                      |
| ---------- | ----------------------------------------- |
| 백엔드     | Python 3.11, FastAPI, OpenAI API (GPT-4o) |
| 프론트엔드 | Next.js 16, shadcn/ui, Tailwind CSS       |
| DB         | Supabase (pgvector, Auth, RLS)            |
| 임베딩     | OpenAI text-embedding-3-small             |
| PDF 파싱   | PyMuPDF                                   |

## 아키텍처

```
[사용자 입력]
  채용공고 (텍스트/스크린샷) + 이력서 (PDF/텍스트) + 자소서 질문
      │
      ▼
[채용공고 분석]  →  요구 역량/키워드 추출
[이력서 파싱]   →  구조화된 경력/프로젝트/스킬
      │
      ▼
[RAG 검색]  →  합격 자소서 136건에서 유사 사례 검색 (Parent-Child Chunking)
      │
      ▼
[자소서 생성]  →  합격 자소서 스타일 + 채용공고 맞춤 + 내 경험 기반
      │
      ▼
[9명 AI 평가]  →  3그룹 × 3명 병렬 평가 (SSE 실시간 스트리밍)
      │
      ▼
[피드백 반영 재생성]  →  평가 결과 기반 자동 개선
```

## 설치 및 실행

### 사전 요구사항

- Python 3.11+, conda, Node.js 18+
- Supabase 프로젝트 (pgvector 확장)
- OpenAI API Key

### 백엔드

```bash
# conda 환경 생성
conda create -n cover-letter python=3.11 -y
conda activate cover-letter

# 의존성 설치
uv pip install openai "supabase>=2.0" typer rich python-dotenv pymupdf "fastapi[standard]" uvicorn

# .env 설정
cp .env.example .env
# SUPABASE_URL, SUPABASE_KEY, OPENAI_API_KEY 입력

# 합격 자소서 임베딩 (최초 1회)
python -m src.embedder

# FastAPI 서버 실행
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

### 프론트엔드

```bash
cd frontend

# 의존성 설치
npm install

# .env.local 설정
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 입력

# 개발 서버 실행
npm run dev
```

### 접속

- 프론트엔드: http://localhost:3000
- API 문서: http://localhost:8000/docs
- 개발 모드: 로그인 페이지 하단 "개발 모드로 진입" (localhost 전용)

## CLI 사용법

프론트엔드 없이 CLI로도 사용 가능합니다.

```bash
# 자소서 생성 + 평가
python -m src.cli generate

# 이력서 등록
python -m src.cli add-resume resume.pdf --name "홍길동"

# 저장된 이력서 조회
python -m src.cli resumes

# 합격 자소서 임베딩
python -m src.cli embed
```

## 프로젝트 구조

```
cover-letter/
├── api/main.py              # FastAPI 백엔드 (REST + SSE)
├── src/
│   ├── embedder.py           # 합격 자소서 → Parent-Child 청킹 → 임베딩
│   ├── parser.py             # 이력서 파싱 + Supabase 저장/조회
│   ├── analyzer.py           # 채용공고 → 요구 역량 추출
│   ├── retriever.py          # 벡터 유사도 검색
│   ├── generator.py          # RAG + 자소서 생성
│   ├── evaluator.py          # 9명 LLM-as-a-Judge 평가
│   └── cli.py                # Typer CLI
├── frontend/                 # Next.js 대시보드
├── data/data.txt             # 합격 자소서 원본 (39건)
├── PLAN.md                   # 상세 기획 문서
└── CLAUDE.md                 # 개발 컨텍스트
```

## 라이선스

MIT
