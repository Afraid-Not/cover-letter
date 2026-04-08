# AURA — Cover Letter Generator

## 프로젝트 개요

합격 자소서 기반 RAG + LLM-as-a-Judge 9명 평가 자소서 생성 풀스택 앱.

## 기술 스택

- **백엔드**: Python 3.11, FastAPI, OpenAI API (GPT-4o), Supabase (pgvector)
- **프론트엔드**: Next.js 16, shadcn/ui, Tailwind CSS, Framer Motion
- **DB**: Supabase (pgvector, Auth, RLS)
- **패키지 관리**: conda (env: cover-letter), uv pip install

## 개발 환경 실행

```bash
# 백엔드
conda activate cover-letter
cd D:/dev/cover-letter
uvicorn api.main:app --host 0.0.0.0 --port 8000

# 프론트엔드
cd frontend
npm run dev
```

- FastAPI: http://localhost:8000 (docs: /docs)
- Next.js: http://localhost:3000

## 파일 구조

```
cover-letter/
├── api/main.py              # FastAPI — REST + SSE 스트리밍 + 프로젝트 CRUD + 프로필 + 플랜 API
├── src/
│   ├── embedder.py           # data.txt → Parent-Child 청킹 → 임베딩 → Supabase
│   ├── parser.py             # 이력서 파싱 (텍스트/PDF) → 구조화 → Supabase 저장
│   ├── analyzer.py           # 채용공고 텍스트 → 요구 역량/키워드 추출
│   ├── researcher.py         # 회사명 → OpenAI + Tavily + DART → 미션/비전/제품·서비스/기업규모 → dict 반환
│   ├── retriever.py          # Supabase 벡터 유사도 검색 (Child 검색 + Parent 컨텍스트)
│   ├── generator.py          # RAG + 이력서 + 채용공고 + 회사 정보 → 자소서 생성/재생성 (글자수 ±10% 재시도)
│   ├── evaluator.py          # 9명 LLM-as-a-Judge 병렬 평가 + SSE 스트리밍
│   ├── scoring_tables.py     # 서류 통과 확률 후처리 보정 테이블 (대학 티어/전공/나이/학력/기업규모)
│   └── cli.py                # Typer CLI (프론트 없이 사용 가능)
├── frontend/                 # Next.js 16 대시보드
│   └── src/
│       ├── app/              # 페이지: /, /welcome, /login, /signup, /history, /projects/[id], /resumes, /mypage, /pricing, /terms, /privacy
│       ├── components/       # app-shell, sidebar, navbar, footer-bar, auth-guard/provider, evaluation-card/stream
│       │   └── ui/           # ai-loader, bento-grid, sign-in, sign-up, stepper, badge, button, card, dialog…
│       ├── hooks/            # use-navigation-guard (작업 중 브라우저 이탈 차단)
│       └── lib/              # api.ts (FastAPI 호출 + 프로젝트 CRUD), supabase.ts
├── migration/                # Supabase DB 마이그레이션 SQL
│   ├── 002_companies_table.sql        # companies 테이블 (회사 조사 캐시)
│   ├── 003_match_companies_function.sql
│   ├── 004_add_plan_usage_tracking.sql  # profiles 플랜 컬럼 + is_regeneration 플래그
│   └── 005_avatars_storage.sql        # profiles avatar_url/bio 컬럼 + avatars 스토리지 버킷 + RLS
├── email-templates/          # Supabase Auth 이메일 템플릿 (가입 인증)
├── data/data.txt             # 합격 자소서 39건 원본
├── pyproject.toml            # Python 프로젝트 설정 + 의존성
├── .env                      # SUPABASE_URL, SUPABASE_KEY, OPENAI_API_KEY, TAVILY_API_KEY, DART_API_KEY
├── frontend/.env.local       # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
└── PLAN.md                   # 상세 기획 문서
```

## Supabase 테이블

- `documents` — 합격 자소서 청크 (Parent-Child, parent_id로 연결)
- `resumes` — 사용자 이력서 (user_id + RLS)
- `generations` — 생성 이력 (자소서 + 평가 결과, user_id + RLS)
  - `company_research jsonb` — 회사 조사 결과 (미션/비전/제품·서비스)
  - `is_regeneration boolean` — 피드백 기반 재생성 여부 (월별 쿼터 구분용)
- `companies` — 회사 조사 캐시 (embedding 포함, 중복 검색 방지)
- `profiles` — 사용자 프로필 (user_id + RLS), `/api/profiles` CRUD
  - `plan` — free / pro / enterprise (기본값 free)
  - `job_seeker_status` — 신입 / 경력
  - `years_of_experience`, `education_level`, `education_major`
  - `job_embedding` — 직무명 벡터 (유사도 검색용)
  - `avatar_url` — 프로필 사진 URL (Supabase Storage avatars 버킷)
  - `bio` — 자기소개 (최대 200자)
- `avatars` (Storage Bucket) — 프로필 사진 저장 (public read, 소유자만 write); 폴더 구조: `{user_id}/{filename}`

## 주요 설계 결정

- 채용공고 URL 스크래핑 안 함 → 텍스트 복붙 또는 스크린샷(GPT-4o Vision) 업로드
- Parent-Child Chunking: Child(Q&A)에서 검색, Parent(전체)로 컨텍스트 제공
- 9명 평가관: 3그룹(HR/현업팀장/채용리더) × 3명, 채용공고 기반 동적 백그라운드
- 평가 SSE 스트리밍: 각 평가관 결과를 실시간으로 프론트에 전달
- Supabase Auth + RLS: 사용자별 데이터 격리
- 회사 조사 (researcher.py): 프로젝트 생성 시 1회 실행 → DB에 저장 → 재생성 시 재사용 (웹서치 중복 방지)
  - OpenAI + Tavily web search + DART API 조합으로 미션/비전/제품서비스/직원수/매출/기업규모 수집
  - 검색 1회당 비용: OpenAI ~$0.025~0.03, Tavily 별도
  - 결과는 `generations.company_research jsonb`에 저장, Step 1 UI에 표시
  - 생성 프롬프트에 `## 회사 정보` 섹션으로 삽입 (지원동기·비전 작성 품질 향상)
  - 자동 조사 결과 없을 시 Step 1에서 미션/비전/주요 제품서비스 직접 입력 가능

## 서류 통과 확률 보정 (scoring_tables.py)

AI 평가 점수에 추가 보정을 적용해 현실적인 통과 확률을 산출:

- **대학 티어**: SKY(+10) → 서성한/KAIST/POSTECH(+8) → 중경외시/과기원(+5) → 건동홍숙이(+3) 등
- **전공 관련도**: 직접 관련(+5) / 유사(+2) / 무관(-3)
- **나이/직급**: 직급-연령 적정성 보정
- **학력**: 박사(+5) / 석사(+3) / 학사(0) / 전문학사(-2)
- **기업규모**: 대기업/중견기업/중소기업별 가중치 multiplier 적용

## 평가관 설계 (evaluator.py)

9명 평가관은 그룹별로 서로 다른 `focus` 관점을 가져 피드백 중복을 방지한다:

| 그룹          | 평가관 1              | 평가관 2                | 평가관 3            |
| ------------- | --------------------- | ----------------------- | ------------------- |
| HR 인사담당자 | 첫인상/형식 완성도    | 맞춤 작성 여부/구체성   | 진정성/스토리텔링   |
| 현업 팀장     | 기술 스택 매칭        | 본인 기여도 구분 + 수치 | 논리 구조/사고 흐름 |
| 채용 리더     | 성장 가능성/학습 능력 | 회사 비전과의 연결      | 차별화 포인트       |

- temperature: 0.7 (다양성 확보)
- `aggregate_feedback()`: 점수 낮은 항목 + 평가관별 피드백을 섹션 구분된 개선 지시 형태로 출력

## 자소서 생성/재생성 (generator.py)

- **초기 생성**: `GENERATE_SYSTEM_PROMPT` 사용
- **피드백 재생성**: `REGENERATE_SYSTEM_PROMPT` 사용 (피드백 우선 반영 명시)
  - `previous_answer` + `feedback`을 프롬프트 **최상단**에 배치 (묻히지 않도록)
  - 이전 답변을 포함해서 모델이 구체적으로 무엇을 고쳐야 할지 파악 가능
  - API: `GenerateRequest.previous_answer` 필드, 프론트: `handleRegenerate`에서 현재 `answer` state 전달
- **글자수 준수**: 지정 글자수의 90~100% 범위 엄수, 미달 시 최대 3회 재시도

## UI 디자인

- **테마**: Soft/Pastel 다크 — 라벤더/바이올렛 톤 (primary hue 290)
- **다크모드 색상**: background `oklch(0.135)`, card `oklch(0.26)`, border `oklch(0.32)` — 충분한 명도 차이 확보
- **네비게이션**: 상단 고정 Navbar (로고 + 메뉴 + 현재 플랜 배지 + 마이페이지 링크 + 플랜 업그레이드 버튼 + 로그아웃), 사이드바는 프로젝트 상세 페이지에서만 사용; 이력서 미등록 시 등록 유도 툴팁 표시
- **웰컴 페이지** (`/welcome`): Framer Motion stagger 카드 애니메이션으로 핵심 기능 소개
- **마이페이지** (`/mypage`): MetricCard + UsageBar 컴포넌트, 프로필 인라인 편집 (이름/희망직무/자기소개), 아바타 업로드 (카메라 아이콘 오버레이, Supabase Storage), Framer Motion stagger
- **요금제 페이지** (`/pricing`): Free/Pro/Enterprise 3-tier 비교 카드, 플랜 선택 + toast 알림
- **AI 로더** (`AiLoader`): Portal 기반 전체화면 오버레이, pointer-events 차단으로 중복 요청 방지
- **프로젝트 카드**: 고정 높이, 좌측 상태 액센트 바, 부드러운 그림자
- **결과 레이아웃**: 2-Column (자소서+피드백 좌 / 통과확률+평가카드 우)
- **Step 1 레이아웃**: 채용 공고 요약 + 회사 정보 2열 그리드 (`grid-cols-2 items-stretch`)
- **콘텐츠 영역**: max-w-7xl, 넓은 레이아웃
- **상태 컬러**: draft(gray), ready(sky), generated(amber), evaluated(emerald)
- **서비스명**: AURA

## 플랜 시스템 (api/main.py)

- `PLAN_LIMITS` dict: free (이력서 1개, 생성 5회/월, 재생성 0회) | pro (이력서 10개, 생성 무제한, 재생성 5회/월) | enterprise (모두 무제한)
- 월별 사용량 추적: `_count_monthly_usage()` — `is_regeneration` 플래그로 생성/재생성 구분
- `/api/generate`, `/api/resumes` 엔드포인트에서 쿼터 초과 시 HTTP 403 `PLAN_LIMIT` 반환
- `/api/usage` — 현재 플랜 + 월별 사용량 조회
- `/api/profiles/plan` PATCH — 플랜 변경
- 회원가입 플로우: 회원가입 → `/pricing?onboarding=1` → 플랜 선택 → `/welcome`

## 프로젝트 플로우

- 메인 대시보드(`/`) → 프로젝트 카드 목록 (status: draft/ready/generated/evaluated)
- 프로젝트 생성 → 채용공고 입력 → 자동 분석 → 분석 결과 확인/수정 모달 → `/projects/[id]`로 이동
- 프로젝트 상세(`/projects/[id]`) → 4단계 위자드: 채용공고 → 이력서 → 작성설정 → 결과
- Step 1에서 채용 공고 요약 + 회사 정보를 2열 그리드로 나란히 표시 (`grid-cols-2 items-stretch`)
- Step 1에서 분석 결과(회사/직무/역량/키워드) 인라인 수정 가능
- 회사 정보 자동 조사 결과 없을 시 미션/비전/주요 제품서비스 직접 입력 폼 표시 → `company_research jsonb`에 저장
- 회사명/직무 미입력 시 다음 단계 진행 불가
- 프로젝트 데이터는 `generations` 테이블 재사용 (별도 테이블 없음)
- `use-navigation-guard` 훅으로 생성/평가 중 브라우저 이탈(새로고침·뒤로가기) 차단
- 마이페이지(`/mypage`) → 사용량 지표(이력서/생성/재생성/플랜) + 프로필 수정 + 최근 프로젝트
- 요금제 페이지(`/pricing`) → Free/Pro/Enterprise 비교 + 플랜 변경

## 코드 컨벤션

- Python: 타입 힌트 사용
- TypeScript: arrow function 사용, shadcn/ui 컴포넌트 기반
- 커밋 메시지: 한국어 가능, Co-Authored-By 포함
