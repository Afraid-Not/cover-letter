# 합격 — Cover Letter Generator

## 프로젝트 개요

합격 자소서 기반 RAG + LLM-as-a-Judge 9명 평가 자소서 생성 풀스택 앱.

## 기술 스택

- **백엔드**: Python 3.11, FastAPI, AsyncOpenAI (GPT-4o), Supabase (pgvector), httpx, AsyncTavilyClient
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
.

## 파일 구조

```
cover-letter/
├── api/main.py              # FastAPI — 완전 비동기 REST + SSE 스트리밍 + 프로젝트 CRUD + 프로필 + 플랜 API
├── src/
│   ├── embedder.py           # data.txt → Parent-Child 청킹 → 임베딩 → Supabase (동기, standalone)
│   ├── parser.py             # 이력서 파싱 (텍스트/PDF) → 구조화 → Supabase 저장 (async)
│   ├── analyzer.py           # 채용공고 텍스트 → 요구 역량/키워드 추출 (async)
│   ├── researcher.py         # 회사명 → AsyncOpenAI + AsyncTavilyClient + httpx(DART) → dict 반환 (async)
│   ├── retriever.py          # Supabase 벡터 유사도 검색 + Parent 병렬 조회 (async)
│   ├── generator.py          # RAG + 이력서 + 채용공고 + 회사 정보 → 자소서 생성/재생성 (async, 글자수 ±10% 재시도)
│   ├── evaluator.py          # 9명 LLM-as-a-Judge 병렬 평가 + SSE 스트리밍 (async)
│   ├── scoring_tables.py     # 서류 통과 확률 후처리 보정 테이블 (대학 티어/전공/나이/학력/기업규모)
│   └── cli.py                # Typer CLI (_sync() 래퍼로 async 함수 동기 실행)
├── frontend/                 # Next.js 16 대시보드
│   └── src/
│       ├── app/              # 페이지: /, /welcome, /login, /signup, /history, /projects/[id], /resumes, /mypage, /pricing, /support, /support/[id], /terms, /privacy, /admin, /auth/callback, /payments/success, /payments/fail (※ /onboarding 삭제됨 → /signup?oauth=google으로 통합)
│       ├── components/       # app-shell, sidebar, navbar, footer-bar, auth-guard/provider, evaluation-card/stream
│       │   └── ui/           # ai-loader, bento-grid, sign-in, sign-up, stepper, badge, button, card, dialog…
│       ├── hooks/            # use-navigation-guard (작업 중 브라우저 이탈 차단)
│       └── lib/              # api.ts (FastAPI 호출 + 프로젝트 CRUD + adminApi + supportApi), supabase.ts
├── migration/                # Supabase DB 마이그레이션 SQL
│   ├── 002_companies_table.sql        # companies 테이블 (회사 조사 캐시)
│   ├── 003_match_companies_function.sql
│   ├── 004_add_plan_usage_tracking.sql  # profiles 플랜 컬럼 + is_regeneration 플래그
│   ├── 005_avatars_storage.sql        # profiles avatar_url/bio 컬럼 + avatars 스토리지 버킷 + RLS
│   ├── 006_fix_rls_policies.sql       # RLS 정책 보완 (resumes DELETE + profiles with_check 명시)
│   ├── 007_admin.sql                  # profiles.role, extra_regenerations, app_settings 테이블
│   ├── 008_subscriptions.sql          # subscriptions 테이블 (구독 결제 정보)
│   ├── 009_coupons.sql                # coupons 테이블 + profiles.extra_generations 컬럼
│   ├── 010_soft_delete_projects.sql   # generations.deleted_at 컬럼 (소프트 삭제)
│   ├── 011_company_search_credits.sql # profiles.extra_company_searches + coupons.bonus_company_searches
│   ├── 012_birth_date.sql             # profiles.birth_date 컬럼 추가
│   ├── 013_support_tickets.sql        # support_tickets 테이블 (고객 문의, category/status/admin_note)
│   └── 014_support_replies.sql        # support_replies 테이블 (관리자·유저 답변 스레드)
├── email-templates/          # Supabase Auth 이메일 템플릿 (가입 인증)
├── data/data.txt             # 합격 자소서 39건 원본
├── pyproject.toml            # Python 프로젝트 설정 + 의존성
├── .env                      # SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, TAVILY_API_KEY, DART_API_KEY, TOSS_CLIENT_KEY, TOSS_SECRET_KEY, CRON_SECRET, ALLOWED_ORIGINS
├── frontend/.env.local       # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL
└── PLAN.md                   # 상세 기획 문서
```

## Supabase 테이블

- `documents` — 합격 자소서 청크 (Parent-Child, parent_id로 연결)
- `resumes` — 사용자 이력서 (user_id + RLS)
- `generations` — 생성 이력 (자소서 + 평가 결과, user_id + RLS)
  - `company_research jsonb` — 회사 조사 결과 (미션/비전/제품·서비스)
  - `is_regeneration boolean` — 피드백 기반 재생성 여부 (월별 쿼터 구분용)
  - `deleted_at timestamptz` — 소프트 삭제 타임스탬프 (월별 사용량 카운트 보존)
- `companies` — 회사 조사 캐시 (embedding 포함, 중복 검색 방지)
- `profiles` — 사용자 프로필 (user_id + RLS), `/api/profiles` CRUD
  - `plan` — free / pro / enterprise (기본값 free)
  - `job_seeker_status` — 신입 / 경력
  - `years_of_experience`, `education_level`, `education_major`
  - `birth_date` — 생년월일 (DATE, 회원가입 시 수집, 서류 통과 확률 나이 보정에 사용)
  - `job_embedding` — 직무명 벡터 (유사도 검색용)
  - `avatar_url` — 프로필 사진 URL (Supabase Storage avatars 버킷)
  - `bio` — 자기소개 (최대 200자)
  - `extra_regenerations` — 관리자가 부여한 추가 재생성 횟수
  - `extra_generations` — 쿠폰으로 적립된 추가 생성 횟수
  - `extra_company_searches` — 쿠폰/관리자로 부여된 추가 회사 검색 크레딧 (free 플랜 전용)
- `avatars` (Storage Bucket) — 프로필 사진 저장 (public read, 소유자만 write); 폴더 구조: `{user_id}/{filename}`
- `subscriptions` — 구독 결제 정보 (user_id, plan, billing_key, customer_key, status, amount, last_billed_at, next_billing_date)
- `coupons` — 쿠폰 (code PK, expires_at, bonus_generations, bonus_regenerations, bonus_company_searches, used_by, used_at); RLS로 직접 접근 차단, API만 사용
- `support_tickets` — 고객 문의 (id, user_id + RLS, category: complaint/suggestion/general, title, content, status: open/in_progress/closed, admin_note, created_at, updated_at)
- `support_replies` — 고객센터 답변 스레드 (id, ticket_id FK, sender_type: admin/user, content, created_at); 본인 문의의 답변만 조회 가능

## 주요 설계 결정

- 채용공고 URL 스크래핑 안 함 → 텍스트 복붙 또는 스크린샷(Claude Haiku 4.5 Vision) 업로드
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
- **나이/직급**: 직급-연령 적정성 보정 (프로필 `birth_date`에서 만 나이 계산, 없으면 이력서 졸업연도 추정 fallback)
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
- **회원가입 3단계**: Step1(이메일/비밀번호) → Step2(이름/생년월일/전화번호/약관동의) → Step3(희망직무/전공/학력/취준상태); Google OAuth 신규 가입 시 `/signup?oauth=google`으로 리다이렉트하여 Step2부터 시작 (이메일·이름 자동 채움)
- **웰컴 페이지** (`/welcome`): Framer Motion stagger 카드 애니메이션으로 핵심 기능 소개
- **마이페이지** (`/mypage`): MetricCard + UsageBar 컴포넌트, 프로필 인라인 편집 (이름/희망직무/자기소개), 아바타 업로드 (카메라 아이콘 오버레이, Supabase Storage), Framer Motion stagger
- **요금제 페이지** (`/pricing`): Free/Pro/Enterprise 3-tier 비교 카드, 플랜 선택 + toast 알림
- **AI 로더** (`AiLoader`): Portal 기반 전체화면 오버레이, pointer-events 차단으로 중복 요청 방지
- **프로젝트 카드**: 고정 높이, 좌측 상태 액센트 바, 부드러운 그림자
- **결과 레이아웃**: 2-Column (자소서+피드백 좌 / 통과확률+평가카드 우)
- **Step 1 레이아웃**: 채용 공고 요약 + 회사 정보 2열 그리드 (`grid-cols-2 items-stretch`)
- **콘텐츠 영역**: max-w-7xl, 넓은 레이아웃
- **상태 컬러**: draft(gray), ready(sky), generated(amber), evaluated(emerald)
- **서비스명**: 합격

## 관리자 시스템

- **접근**: `profiles.role = 'admin'`인 유저만 `/admin` 페이지 진입 가능 (`auth-provider`에서 `role` 노출)
- **관리자 대시보드** (`frontend/src/app/admin/page.tsx`):
  - KPI 카드: 총 유저 수, 오늘/총 생성 수, 플랜 분포 (Recharts 파이 차트)
  - 유저 관리 탭: 플랜 드롭다운 변경, 추가 재생성 횟수·회사검색 크레딧 인라인 즉시 저장
  - 생성 이력 탭: 최근 100건 조회
  - 자소서 등록 이력 탭: 최근 100건 조회
  - 플랜 구매 설정: `app_settings` 테이블의 `plan_{free|pro|enterprise}_enabled` 토글
  - **쿠폰 관리 탭**: 쿠폰 생성(생성횟수/재생성횟수/회사검색횟수 설정, 랜덤 코드 자동 생성, 7일 만료) + 쿠폰 목록(상태: 유효/만료/사용됨)
  - **고객 문의 탭**: 문의 목록 + 인라인 답변 작성 + 상태 변경 (open→in_progress→closed); 답변 시 open 문의 자동으로 in_progress로 전환
- **관리자 API** (`/api/admin/*`): `_check_admin()` 함수로 권한 검증
  - `GET /api/admin/stats` — KPI 통계
  - `GET /api/admin/users` — 전체 유저 목록 (Supabase Auth Admin API + profiles 조인)
  - `GET /api/admin/generations` — 최근 생성 이력 100건
  - `GET /api/admin/resumes` — 최근 이력서 등록 이력 100건
  - `GET /api/admin/settings` — 플랜 on/off 설정 조회
  - `PATCH /api/admin/settings` — 플랜 on/off 설정 변경
  - `PATCH /api/admin/users/{user_id}/plan` — 유저 플랜 강제 변경
  - `PATCH /api/admin/users/{user_id}/extra-regenerations` — 추가 재생성 횟수 설정
  - `PATCH /api/admin/users/{user_id}/extra-company-searches` — 추가 회사 검색 크레딧 설정
  - `GET /api/admin/coupons` — 쿠폰 목록 조회
  - `POST /api/admin/coupons` — 쿠폰 생성 (code, bonus_generations, bonus_regenerations, bonus_company_searches, 7일 만료)
  - `GET /api/admin/support` — 전체 고객 문의 목록 (최신순)
  - `GET /api/admin/support/{id}` — 문의 상세 + 답변 스레드
  - `PATCH /api/admin/support/{id}` — 문의 상태(status)/관리자 노트(admin_note) 업데이트
  - `POST /api/admin/support/{id}/reply` — 관리자 답변 등록
- **퍼블릭 설정 API**: `GET /api/plan-settings` — 인증 없이 플랜 활성 여부 반환, pricing 페이지에서 사용
- **`/api/usage` 개선**: `extra_regenerations`/`extra_generations`/`extra_company_searches`를 각 `limits`에 합산 반환 (무제한 플랜 제외), `extra_company_searches` 필드 별도 노출
- **pricing 페이지 연동**: 페이지 진입 시 `/api/plan-settings` fetch → 비활성 플랜 카드 dimmed + 버튼 disabled
- **마이그레이션**: `migration/007_admin.sql` — `profiles.role`, `profiles.extra_regenerations`, `app_settings` 테이블

## 플랜 시스템 (api/main.py)

- `PLAN_LIMITS` dict: free (이력서 1개, 생성 5회/월, 재생성 0회, 회사검색 0회) | pro (이력서 10개, 생성 무제한, 재생성 5회/월, 회사검색 무제한) | enterprise (모두 무제한)
- 월별 사용량 추적: `_count_monthly_usage()` — `is_regeneration` 플래그로 생성/재생성 구분
- `/api/generate`, `/api/resumes` 엔드포인트에서 쿼터 초과 시 HTTP 403 `PLAN_LIMIT` 반환
- `/api/usage` — 현재 플랜 + 월별 사용량 조회
- `/api/profiles/plan` PATCH — 플랜 변경
- 회원가입 플로우: 회원가입 → `/pricing?onboarding=1` → 플랜 선택 → `/welcome`
- **쿠폰 시스템**: free/pro 플랜 유저가 `POST /api/coupons/redeem`으로 코드 입력 시 `extra_generations`/`extra_regenerations`/`extra_company_searches` 적립 (enterprise 제외, 1인 1회)
- **소프트 삭제**: 프로젝트 삭제 시 `deleted_at` 설정 — 버전 행 유지로 월별 사용량 카운트 보존; 목록 조회 시 `is_("deleted_at", "null")`로 필터
- **평가 권한**: free 플랜도 `extra_regenerations > 0`이면 평가 허용 (`canEvaluate` 로직)
- **회사 자동 검색**: free 플랜은 `extra_company_searches` 크레딧 소모; 부족 시 HTTP 403 `COMPANY_SEARCH_LIMIT` 반환
- **회원 탈퇴**: `DELETE /api/account` — service role key로 Supabase Auth 유저 삭제

## Toss Payments 결제 시스템

- **결제 수단**: Toss Payments 빌링키 방식 정기 구독 결제
- **요금**: `PLAN_AMOUNTS` — pro=9,900원/월, enterprise=99,000원/월
- **환경 변수**: `TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY`, `CRON_SECRET` (`.env`에 추가 필요)
- **결제 API** (`api/main.py`):
  - `POST /api/payments/billing-auth` — 빌링키 발급 + 즉시 첫 결제 + 플랜 활성화 (authKey, customerKey, planKey 파라미터)
  - `GET /api/payments/subscription` — 현재 구독 정보 조회
  - `DELETE /api/payments/subscription` — 구독 취소 (status → cancelled)
  - `POST /api/payments/webhook` — Toss 자동결제 웹훅 (DONE/FAILED 처리)
  - `POST /api/payments/charge-recurring` — 월별 정기결제 크론 (x-cron-secret 헤더 필요)
- **결제 페이지**:
  - `/payments/success` — 결제 성공 콜백 처리 (authKey/customerKey/planKey → billingAuth API 호출 → `/welcome` 또는 `/mypage`로 리다이렉트)
  - `/payments/fail` — 결제 실패 안내
- **pricing 페이지 연동**: Toss Payments 위젯 직접 연동, 유료 플랜 선택 시 결제 위젯 실행
- **프론트엔드 API 함수** (`frontend/src/lib/api.ts`): `billingAuth`, `getSubscription`, `cancelSubscription`
- **마이그레이션**: `migration/008_subscriptions.sql` — subscriptions 테이블

## 프로젝트 플로우

- 메인 대시보드(`/`) → 프로젝트 카드 목록 (status: draft/ready/generated/evaluated, 소프트 삭제된 항목 제외)
- 프로젝트 생성 → 채용공고 입력 → 자동 분석 → 분석 결과 확인/수정 모달 → `/projects/[id]`로 이동
- 프로젝트 상세(`/projects/[id]`) → 4단계 위자드: 채용공고 → 이력서 → 작성설정 → 결과
  - 버전 선택 시 `resume_id`/`char_limit`/`mode` 자동 복원
  - 생성 후 `canEvaluate`이면 자동 평가; 평가 없는 버전엔 "평가하기" 버튼 노출 (`handleEvaluateOnly`)
  - 평가 결과는 `PATCH /api/projects/{id}/versions/{vid}`로 버전 + 루트 행에 동시 저장
- Step 1에서 채용 공고 요약 + 회사 정보를 2열 그리드로 나란히 표시 (`grid-cols-2 items-stretch`)
- Step 1에서 분석 결과(회사/직무/역량/키워드) 인라인 수정 가능
- 회사 정보 자동 조사 결과 없을 시 미션/비전/주요 제품서비스 직접 입력 폼 표시 → `company_research jsonb`에 저장
- 회사 자동 검색 버튼: free 플랜은 크레딧 잔여량 표시, 크레딧 소진 시 버튼 숨김
- 회사명/직무 미입력 시 다음 단계 진행 불가
- 프로젝트 데이터는 `generations` 테이블 재사용 (별도 테이블 없음)
- `use-navigation-guard` 훅으로 생성/평가 중 브라우저 이탈(새로고침·뒤로가기) 차단
- 마이페이지(`/mypage`) → 사용량 지표(이력서/생성/재생성/플랜/회사검색 크레딧) + 프로필 수정 + 통합 활동 피드(`/api/activity`) + 쿠폰 등록 모달 + 회원 탈퇴 모달
- 요금제 페이지(`/pricing`) → Free/Pro/Enterprise 비교 + 플랜 변경
- 고객센터(`/support`) → 탭 2개: 새 문의(카테고리/제목/내용 입력) + 문의 내역(상태별 목록); `/support/[id]`에서 답변 스레드 조회
- `/auth/callback` — Google OAuth 콜백 처리: 기존 유저 → `/`, 신규 유저 → `/signup?oauth=google` (프로필 존재 여부로 구분)

## 전체 API 엔드포인트

| 메서드 | 경로                                           | 설명                                                     |
| ------ | ---------------------------------------------- | -------------------------------------------------------- |
| POST   | `/api/analyze-job`                             | 채용공고 분석 (회사/직무/역량/키워드 추출)               |
| POST   | `/api/generate`                                | 자소서 생성/재생성 (RAG + 이력서 + 채용공고 + 회사 정보) |
| POST   | `/api/evaluate`                                | 9명 평가관 평가 (동기)                                   |
| POST   | `/api/evaluate/stream`                         | 9명 평가관 SSE 스트리밍 평가                             |
| POST   | `/api/parse-image`                             | 이미지/PDF → 텍스트 추출 (Claude Haiku 4.5 Vision)       |
| GET    | `/api/check-email`                             | 이메일 중복 확인 (Supabase Auth Admin API)               |
| GET    | `/api/resumes`                                 | 이력서 목록 조회                                         |
| POST   | `/api/resumes`                                 | 이력서 등록 (텍스트)                                     |
| POST   | `/api/resumes/upload`                          | 이력서 파일 업로드 (PDF/txt/md)                          |
| GET    | `/api/resumes/{id}`                            | 이력서 상세 조회                                         |
| PATCH  | `/api/resumes/{id}`                            | 이력서 수정 (이름/structured_data)                       |
| DELETE | `/api/resumes/{id}`                            | 이력서 삭제                                              |
| POST   | `/api/projects`                                | 프로젝트 생성 (채용공고 → 자동 분석)                     |
| GET    | `/api/projects`                                | 프로젝트 목록 조회 (소프트 삭제 제외)                    |
| GET    | `/api/projects/{id}`                           | 프로젝트 상세 + 버전 목록                                |
| PATCH  | `/api/projects/{id}`                           | 프로젝트 수정 (company_research 포함)                    |
| DELETE | `/api/projects/{id}`                           | 프로젝트 소프트 삭제                                     |
| POST   | `/api/projects/{id}/research`                  | 회사 자동 조사 (캐시 → 웹서치)                           |
| POST   | `/api/projects/{id}/versions`                  | 버전 생성 (재생성)                                       |
| PATCH  | `/api/projects/{id}/versions/{vid}`            | 버전 평가 결과 업데이트 (버전 + 루트 행 동시)            |
| GET    | `/api/activity`                                | 통합 활동 피드 (프로젝트·이력서·재생성, 최근 30건)       |
| GET    | `/api/generations`                             | 생성 이력 목록                                           |
| POST   | `/api/generations`                             | 생성 이력 저장                                           |
| GET    | `/api/generations/{id}`                        | 생성 이력 상세                                           |
| POST   | `/api/profiles`                                | 프로필 생성/수정 (upsert)                                |
| GET    | `/api/profiles/me`                             | 내 프로필 조회                                           |
| PATCH  | `/api/profiles/plan`                           | 플랜 변경                                                |
| GET    | `/api/plan-settings`                           | 플랜 활성 여부 조회 (public)                             |
| GET    | `/api/usage`                                   | 사용량 + 한도 조회                                       |
| DELETE | `/api/account`                                 | 회원 탈퇴 (Auth 유저 삭제)                               |
| POST   | `/api/coupons/redeem`                          | 쿠폰 사용 (extra\_\* 적립, enterprise 제외, 1인 1회)     |
| POST   | `/api/payments/billing-auth`                   | 빌링키 발급 + 첫 결제 + 플랜 활성화                      |
| GET    | `/api/payments/subscription`                   | 구독 정보 조회                                           |
| DELETE | `/api/payments/subscription`                   | 구독 취소                                                |
| POST   | `/api/payments/webhook`                        | Toss 자동결제 웹훅                                       |
| POST   | `/api/payments/charge-recurring`               | 월별 정기결제 크론                                       |
| GET    | `/api/admin/stats`                             | 관리자: KPI 통계                                         |
| GET    | `/api/admin/users`                             | 관리자: 유저 목록                                        |
| GET    | `/api/admin/generations`                       | 관리자: 생성 이력 100건                                  |
| GET    | `/api/admin/resumes`                           | 관리자: 이력서 이력 100건                                |
| GET    | `/api/admin/settings`                          | 관리자: 설정 조회                                        |
| PATCH  | `/api/admin/settings`                          | 관리자: 설정 변경                                        |
| PATCH  | `/api/admin/users/{id}/plan`                   | 관리자: 유저 플랜 변경                                   |
| PATCH  | `/api/admin/users/{id}/extra-regenerations`    | 관리자: 추가 재생성 횟수 설정                            |
| PATCH  | `/api/admin/users/{id}/extra-company-searches` | 관리자: 회사 검색 크레딧 설정                            |
| GET    | `/api/admin/coupons`                           | 관리자: 쿠폰 목록 조회                                   |
| POST   | `/api/admin/coupons`                           | 관리자: 쿠폰 생성 (7일 만료)                             |
| POST   | `/api/support`                                 | 고객 문의 접수 (category, title, content)                |
| GET    | `/api/support`                                 | 내 문의 목록 조회                                        |
| GET    | `/api/support/{id}`                            | 문의 상세 + 답변 스레드 조회                             |
| GET    | `/api/admin/support`                           | 관리자: 전체 문의 목록                                   |
| GET    | `/api/admin/support/{id}`                      | 관리자: 문의 상세 + 답변 스레드                          |
| PATCH  | `/api/admin/support/{id}`                      | 관리자: 문의 상태/노트 업데이트                          |
| POST   | `/api/admin/support/{id}/reply`                | 관리자: 문의 답변 등록                                   |

## 비동기 아키텍처

### 백엔드 (Python)

- **OpenAI**: 모든 모듈에서 `AsyncOpenAI` 사용 (`embedder.py` 제외 — standalone 동기 스크립트)
- **Tavily**: `AsyncTavilyClient` (`researcher.py`)
- **DART API**: `httpx.AsyncClient` (`researcher.py`, `requests` 제거됨)
- **Anthropic**: `AsyncAnthropic` (`api/main.py` parse-image 엔드포인트)
- **Supabase**: 동기 클라이언트 유지, `asyncio.to_thread(lambda: ...)` 또는 `asyncio.to_thread(fn)` 으로 래핑
  - `api/main.py`: `async def _run(fn)` 헬퍼 → 모든 `sb.table(...).execute()` 호출 래핑
  - `src/` 모듈: 각 함수 내에서 직접 `asyncio.to_thread` 사용
- **병렬화**: `asyncio.gather`로 독립 쿼리 병렬 실행 (`_count_monthly_usage`, `/api/activity`, `/api/projects/{id}`, `/api/admin/stats`, `/api/usage`)
- **CLI**: `_sync(coro)` 래퍼 (`asyncio.run`) 로 async 함수를 동기 실행

### 프론트엔드 (TypeScript)

- **API 에러 처리**: `_json` 헬퍼 — `r.ok` 검증 후 에러 시 throw, 성공 시 `r.json()` 반환; 자체 에러 처리 함수(generate, updateProject 등)는 미적용
- **SSE 스트리밍**: `evaluateStream` — `res.ok` 검증 + `try/finally { reader.cancel() }` + `JSON.parse` try-catch + summary null 체크
- **Auth Provider**: role 조회 useEffect에 `cancelled` 플래그 + `Promise.resolve()` 래핑 + `.catch()` fallback

## 코드 컨벤션

- Python: 타입 힌트 사용, async 함수 우선
- TypeScript: arrow function 사용, shadcn/ui 컴포넌트 기반
- 커밋 메시지: 한국어 가능, Co-Authored-By 포함
