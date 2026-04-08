# AURA — Cover Letter Generator

합격 자소서 기반 RAG + 9명 AI 평가관 자소서 생성 풀스택 앱

## 주요 기능

- **프로젝트 대시보드** — 자소서를 프로젝트 단위로 관리 (draft → ready → generated → evaluated)
- **4단계 위자드** — 채용공고 입력 → 이력서 선택 → 작성 설정 → 생성 & 평가
- **자소서 자동 생성** — 합격 자소서 39건 RAG 기반, 사람이 쓴 것처럼 자연스러운 문체
- **글자수 자동 준수** — 지정 글자수 90~100% 범위 엄수, 미달 시 최대 3회 재시도
- **회사 정보 조사/직접 입력** — OpenAI + Tavily + DART API로 미션/비전/주요 제품·서비스/기업규모 자동 수집; 검색 결과 없을 시 직접 입력 가능, 생성 프롬프트에 컨텍스트로 주입
- **9명 AI 평가관** — HR 인사담당자 3명 + 현업 팀장 3명 + 채용 리더 3명이 실시간 SSE 스트리밍으로 평가
- **서류 통과 확률 보정** — 대학 티어/전공/나이/학력/기업규모 기반 후처리 보정 테이블 적용
- **2-Column 결과 레이아웃** — 자소서+피드백 / 통과확률+평가카드 좌우 배치
- **채용공고 분석** — 텍스트 복붙 또는 스크린샷 업로드 (GPT-4o Vision), 분석 결과 인라인 수정 가능
- **이력서 관리** — PDF/텍스트 업로드, 파싱 후 Supabase에 저장하여 재사용
- **일반 자소서 / 질문 답변** 모드 지원
- **피드백 반영 재생성** — 평가 결과 기반 자동 개선
- **작업 중 이탈 차단** — 생성/평가 중 브라우저 새로고침·뒤로가기 차단
- **플랜 시스템** — Free / Pro / Enterprise 3단계 요금제, 월별 생성/재생성 쿼터 관리
- **마이페이지** — 사용량 지표, 프로필 수정 (이름/희망직무/자기소개), 아바타 사진 업로드, 최근 프로젝트 목록
- **요금제 페이지** — 플랜 비교 및 선택 UI
- **약관/개인정보처리방침** — `/terms`, `/privacy` 정적 페이지

## 기술 스택

| 구분       | 기술                                               |
| ---------- | -------------------------------------------------- |
| 백엔드     | Python 3.11, FastAPI, OpenAI API (GPT-4o)          |
| 프론트엔드 | Next.js 16, shadcn/ui, Tailwind CSS, Framer Motion |
| DB         | Supabase (pgvector, Auth, RLS)                     |
| 임베딩     | OpenAI text-embedding-3-small                      |
| PDF 파싱   | PyMuPDF                                            |
| 회사 조사  | OpenAI web search + Tavily API + DART 공시 API     |

## 아키텍처

```
[사용자 입력]
  채용공고 (텍스트/스크린샷) + 이력서 (PDF/텍스트) + 자소서 질문
      │
      ▼
[채용공고 분석]  →  요구 역량/키워드 추출
[회사 정보 조사]  →  OpenAI + Tavily + DART → 미션/비전/제품·서비스/기업규모 (DB 저장, Step 1 표시)
[이력서 파싱]   →  구조화된 경력/프로젝트/스킬
      │
      ▼
[RAG 검색]  →  합격 자소서 39건에서 유사 사례 검색 (Parent-Child Chunking)
      │
      ▼
[자소서 생성]  →  합격 자소서 스타일 + 채용공고 맞춤 + 회사 정보 + 내 경험 기반
              →  글자수 90~100% 범위 미달 시 최대 3회 재시도
      │
      ▼
[9명 AI 평가]  →  3그룹 × 3명 병렬 평가 (SSE 실시간 스트리밍)
              →  서류 통과 확률 보정 (대학/전공/나이/학력/기업규모)
      │
      ▼
[피드백 반영 재생성]  →  평가 결과 기반 자동 개선
```

## 설치 및 실행

### 사전 요구사항

- Python 3.11+, conda, Node.js 18+
- Supabase 프로젝트 (pgvector 확장)
- OpenAI API Key, Tavily API Key, DART API Key

### 백엔드

```bash
# conda 환경 생성
conda create -n cover-letter python=3.11 -y
conda activate cover-letter

# 의존성 설치
uv pip install openai "supabase>=2.0" typer rich python-dotenv pymupdf "fastapi[standard]" uvicorn tavily-python requests

# .env 설정
cp .env.example .env
# SUPABASE_URL, SUPABASE_KEY, OPENAI_API_KEY, TAVILY_API_KEY, DART_API_KEY 입력

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
├── api/main.py              # FastAPI 백엔드 (REST + SSE + 프로젝트 CRUD + 프로필 + 플랜 API)
├── src/
│   ├── embedder.py           # 합격 자소서 → Parent-Child 청킹 → 임베딩
│   ├── parser.py             # 이력서 파싱 + Supabase 저장/조회
│   ├── analyzer.py           # 채용공고 → 요구 역량 추출
│   ├── researcher.py         # 회사명 → OpenAI + Tavily + DART → 미션/비전/제품·서비스/기업규모
│   ├── retriever.py          # 벡터 유사도 검색
│   ├── generator.py          # RAG + 자소서 생성 (회사 정보 컨텍스트 + 글자수 재시도)
│   ├── evaluator.py          # 9명 LLM-as-a-Judge 평가
│   ├── scoring_tables.py     # 서류 통과 확률 후처리 보정 테이블
│   └── cli.py                # Typer CLI
├── frontend/                 # Next.js 16 대시보드
│   └── src/
│       ├── app/              # 페이지: /, /welcome, /login, /signup, /history, /projects/[id], /resumes, /mypage, /pricing, /terms, /privacy
│       ├── components/       # app-shell, sidebar, navbar, footer-bar, auth-guard/provider, evaluation-card/stream
│       │   └── ui/           # ai-loader, bento-grid, sign-in, sign-up, stepper, badge, button, dialog…
│       ├── hooks/            # use-navigation-guard
│       └── lib/              # api.ts, supabase.ts
├── migration/                # Supabase DB 마이그레이션 SQL
│   ├── 002_companies_table.sql
│   ├── 003_match_companies_function.sql
│   ├── 004_add_plan_usage_tracking.sql
│   └── 005_avatars_storage.sql         # 프로필 아바타 스토리지 + RLS 정책
├── email-templates/          # Supabase Auth 이메일 템플릿
├── data/data.txt             # 합격 자소서 원본 (39건)
├── pyproject.toml            # Python 프로젝트 설정 + 의존성
├── PLAN.md                   # 상세 기획 문서
└── CLAUDE.md                 # 개발 컨텍스트
```

## 라이선스

MIT
