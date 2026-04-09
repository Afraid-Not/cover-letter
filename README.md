# 합격 — Cover Letter Generator

합격 자소서 기반 RAG + 9명 AI 평가관 자소서 생성 풀스택 앱

## 주요 기능

- **프로젝트 대시보드** — 자소서를 프로젝트 단위로 관리 (draft → ready → generated → evaluated)
- **4단계 위자드** — 채용공고 입력 → 이력서 선택 → 작성 설정 → 생성 & 평가
- **자소서 자동 생성** — 합격 자소서 39건 RAG 기반, 사람이 쓴 것처럼 자연스러운 문체
- **글자수 자동 준수** — 지정 글자수 90~100% 범위 엄수, 미달 시 최대 3회 재시도
- **회사 정보 조사/직접 입력** — OpenAI + Tavily + DART API로 미션/비전/주요 제품·서비스/기업규모 자동 수집; 검색 결과 없을 시 직접 입력 가능, 생성 프롬프트에 컨텍스트로 주입
- **9명 AI 평가관** — HR 인사담당자 3명 + 현업 팀장 3명 + 채용 리더 3명이 실시간 SSE 스트리밍으로 평가
- **서류 통과 확률 보정** — 대학 티어/전공/나이/학력/기업규모 기반 후처리 보정 테이블 적용 (프로필 생년월일에서 만 나이 계산, 없으면 이력서 졸업연도 추정 fallback)
- **2-Column 결과 레이아웃** — 자소서+피드백 / 통과확률+평가카드 좌우 배치
- **채용공고 분석** — 텍스트 복붙 또는 스크린샷 업로드 (Claude Haiku 4.5 Vision), 분석 결과 인라인 수정 가능
- **이력서 관리** — PDF/텍스트 업로드, 파싱 후 Supabase에 저장하여 재사용
- **일반 자소서 / 질문 답변** 모드 지원
- **피드백 반영 재생성** — 평가 결과 기반 자동 개선
- **작업 중 이탈 차단** — 생성/평가 중 브라우저 새로고침·뒤로가기 차단
- **플랜 시스템** — Free / Pro / Enterprise 3단계 요금제, 월별 생성/재생성 쿼터 관리
- **Toss Payments 구독 결제** — 빌링키 방식 정기 결제, Pro/Enterprise 플랜 자동 갱신
- **쿠폰 시스템** — 쿠폰 코드 입력으로 추가 생성/재생성/회사검색 크레딧 적립 (1인 1회)
- **회사 검색 크레딧** — Free 플랜 유저의 회사 자동 조사 횟수를 크레딧으로 관리
- **소프트 삭제** — 프로젝트 삭제 시 버전 행 유지로 월별 사용량 카운트 보존
- **Google OAuth 로그인** — Supabase Auth Google 소셜 로그인 + `/auth/callback` 처리
- **회원가입 3단계 위자드** — 1단계(이메일/비밀번호) → 2단계(이름/생년월일/전화번호/약관) → 3단계(커리어 정보); Google OAuth 신규 가입 시 `/signup?oauth=google`으로 리다이렉트하여 2단계부터 시작
- **마이페이지** — 사용량 지표, 프로필 수정 (이름/희망직무/자기소개), 아바타 사진 업로드, 통합 활동 피드, 쿠폰 등록 모달, 회원 탈퇴
- **요금제 페이지** — 플랜 비교 및 선택 UI; 관리자가 비활성화한 플랜은 버튼 자동 차단
- **고객센터** — 문의 카테고리별 접수 (불만/건의/일반), 문의 내역 조회, 관리자 답변 확인
- **관리자 대시보드** — `/admin`; KPI 카드, 유저 관리 (플랜 변경·크레딧 부여), 생성/이력서 등록 이력, 플랜 on/off 설정, 쿠폰 생성·목록 관리, 고객 문의 답변·상태 관리
- **약관/개인정보처리방침** — `/terms`, `/privacy` 정적 페이지

## 기술 스택

| 구분        | 기술                                                     |
| ----------- | -------------------------------------------------------- |
| 백엔드      | Python 3.11, FastAPI (완전 비동기), AsyncOpenAI (GPT-4o) |
| 프론트엔드  | Next.js 16, shadcn/ui, Tailwind CSS, Framer Motion       |
| DB          | Supabase (pgvector, Auth, RLS)                           |
| 임베딩      | OpenAI text-embedding-3-small                            |
| 이미지 파싱 | Anthropic AsyncAnthropic (Claude Haiku 4.5 Vision)       |
| PDF 파싱    | PyMuPDF                                                  |
| 회사 조사   | AsyncOpenAI + AsyncTavilyClient + httpx (DART 공시 API)  |
| 결제        | Toss Payments (빌링키 정기 구독)                         |
| 인증        | Supabase Auth (이메일 + Google OAuth)                    |

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
- OpenAI API Key, Anthropic API Key, Tavily API Key, DART API Key, Toss Payments Client/Secret Key

### 백엔드

```bash
# conda 환경 생성
conda create -n cover-letter python=3.11 -y
conda activate cover-letter

# 의존성 설치
uv pip install openai "supabase>=2.0" typer rich python-dotenv pymupdf "fastapi[standard]" uvicorn tavily-python httpx anthropic

# .env 설정
cp .env.example .env
# SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, TAVILY_API_KEY, DART_API_KEY, TOSS_CLIENT_KEY, TOSS_SECRET_KEY, CRON_SECRET 입력

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
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL 입력

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
├── api/main.py              # FastAPI 백엔드 — 완전 비동기 (REST + SSE + CRUD + 결제 + 고객센터 API)
├── src/
│   ├── embedder.py           # 합격 자소서 → Parent-Child 청킹 → 임베딩 (동기, standalone)
│   ├── parser.py             # 이력서 파싱 + Supabase 저장/조회 (async)
│   ├── analyzer.py           # 채용공고 → 요구 역량 추출 (async)
│   ├── researcher.py         # 회사명 → AsyncOpenAI + AsyncTavilyClient + httpx(DART) (async)
│   ├── retriever.py          # 벡터 유사도 검색 + Parent 병렬 조회 (async)
│   ├── generator.py          # RAG + 자소서 생성 (async, 글자수 재시도)
│   ├── evaluator.py          # 9명 LLM-as-a-Judge 병렬 평가 (async)
│   ├── scoring_tables.py     # 서류 통과 확률 후처리 보정 테이블
│   └── cli.py                # Typer CLI (_sync() 래퍼로 async 실행)
├── frontend/                 # Next.js 16 대시보드
│   └── src/
│       ├── app/              # 페이지: /, /welcome, /login, /signup, /history,
│       │                     #         /projects/[id], /resumes, /mypage, /pricing,
│       │                     #         /support, /support/[id], /terms, /privacy,
│       │                     #         /auth/callback, /payments/success, /payments/fail, /admin
│       ├── components/       # app-shell, sidebar, navbar, footer-bar, auth-guard/provider, evaluation-card
│       │   └── ui/           # ai-loader, bento-grid, sign-in, sign-up, stepper, badge, button, dialog…
│       ├── hooks/            # use-navigation-guard
│       └── lib/              # api.ts (adminApi, supportApi 포함), supabase.ts
├── migration/                # Supabase DB 마이그레이션 SQL
│   ├── 002_companies_table.sql
│   ├── 003_match_companies_function.sql
│   ├── 004_add_plan_usage_tracking.sql
│   ├── 005_avatars_storage.sql         # 프로필 아바타 스토리지 + RLS 정책
│   ├── 006_fix_rls_policies.sql       # RLS 정책 보완 (resumes DELETE + profiles with_check)
│   ├── 007_admin.sql                   # profiles.role, extra_regenerations, app_settings 테이블
│   ├── 008_subscriptions.sql           # subscriptions 테이블 (Toss Payments 구독 결제)
│   ├── 009_coupons.sql                 # coupons 테이블 + profiles.extra_generations
│   ├── 010_soft_delete_projects.sql    # generations.deleted_at (소프트 삭제)
│   ├── 011_company_search_credits.sql  # profiles.extra_company_searches + coupons.bonus_company_searches
│   ├── 012_birth_date.sql              # profiles.birth_date 컬럼 추가
│   ├── 013_support_tickets.sql         # support_tickets 테이블 (고객 문의)
│   └── 014_support_replies.sql         # support_replies 테이블 (관리자 답변)
├── email-templates/          # Supabase Auth 이메일 템플릿
├── data/data.txt             # 합격 자소서 원본 (39건)
├── pyproject.toml            # Python 프로젝트 설정 + 의존성
├── PLAN.md                   # 상세 기획 문서
└── CLAUDE.md                 # 개발 컨텍스트
```

## 추후 업데이트 예정 사항

### 핵심 기능 강화

- **채용공고 URL 자동 스크래핑** — 잡코리아·사람인·링크드인 URL 입력 시 채용공고 자동 파싱
- **자소서 버전 비교** — 초안과 재생성 버전을 나란히 비교하는 diff 뷰
- **PDF 내보내기** — 완성된 자소서를 PDF로 다운로드 (글자수·포맷 보존)
- **자소서 공유 링크** — 멘토/지인에게 읽기 전용 링크 공유

### AI 고도화

- **AI 면접 질문 예측** — 자소서 기반으로 예상 면접 질문 + 답변 가이드 생성
- **다국어 자소서 생성** — 영문 Cover Letter 지원 (글로벌 취업 지원)
- **AI 모델 선택** — GPT-4o / Claude / Gemini 중 선택 가능
- **합격 자소서 데이터셋 확대** — 현재 39건 → 100건+ 확보 및 RAG 성능 향상

### 사용자 경험

- **채용 일정 트래커** — 지원 현황(서류/면접/최종) 관리 보드
- **키워드 분석 리포트** — 지원 직무별 통과율 통계 및 약점 패턴 분석
- **이메일 알림** — 평가 완료·답변 도착 시 이메일 푸시 알림
- **모바일 앱 최적화** — PWA 대응 및 모바일 UX 개선

### 인프라 & 운영

- **LLM 비용 추적** — 유저별·엔드포인트별 토큰 사용량 대시보드
- **팀/기업 계정** — 취업 컨설팅 업체용 다중 유저 관리 기능
- **Redis 캐싱** — 회사 정보·채용공고 분석 결과 캐싱으로 응답 속도 개선
- **GitHub/LinkedIn 포트폴리오 연동** — 프로필 자동 임포트

## 라이선스

MIT
