# 합격 — Frontend

합격 자소서 생성 서비스의 Next.js 프론트엔드입니다.

## 기술 스택

- **Next.js 16** (App Router, React 19)
- **shadcn/ui** + **Tailwind CSS 4** — Soft/Pastel 다크 테마 (라벤더/바이올렛, primary hue 290)
- **Framer Motion** — 페이지 전환 및 카드 애니메이션
- **Supabase JS** — Auth 세션 관리, RLS
- **Toss Payments SDK** — 구독 결제 위젯
- **Vercel Analytics** — 웹 분석
- **Lucide React** — 아이콘 

## 개발 서버 실행

```bash
npm run dev
```

→ http://localhost:3000

## 환경 변수

`.env.local` 파일이 필요합니다:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 페이지 구조

| 경로                | 설명                                                  |
| ------------------- | ----------------------------------------------------- |
| `/`                 | 프로젝트 대시보드 — Bento 카드 목록, 새 프로젝트 생성 |
| `/projects/[id]`    | 4단계 위자드: 채용공고 → 이력서 → 설정 → 결과         |
| `/resumes`          | 이력서 관리 — PDF/이미지 업로드, 구조화 데이터 편집   |
| `/history`          | 생성 이력 조회                                        |
| `/login`            | 이메일/비밀번호 + Google OAuth 로그인                 |
| `/signup`           | 회원가입 + 프로필 입력                                |
| `/onboarding`       | Google OAuth 후 프로필 보완 (이름/직무/경력/학력)     |
| `/auth/callback`    | Google OAuth 리다이렉트 콜백 처리                     |
| `/welcome`          | 온보딩 완료 후 안내 (자소서 작성 / 이력서 등록 카드)  |
| `/mypage`           | 사용량 지표, 프로필 수정, 활동 피드, 쿠폰, 회원 탈퇴  |
| `/pricing`          | Free/Pro/Enterprise 플랜 비교 + Toss Payments 결제    |
| `/payments/success` | 결제 성공 콜백 처리                                   |
| `/payments/fail`    | 결제 실패 안내                                        |
| `/admin`            | 관리자 대시보드 (KPI, 유저 관리, 쿠폰, 설정)          |
| `/terms`            | 이용약관                                              |
| `/privacy`          | 개인정보처리방침                                      |

## 주요 컴포넌트

- `app-shell` — 조건부 레이아웃 (인증 페이지 / 공개 페이지 / 풀스크린 분기)
- `navbar` — 상단 고정 헤더 (로고, 네비, 플랜 배지, 사용량, 로그아웃)
- `sidebar` — 접이식 사이드바 (64px ↔ 220px)
- `footer-bar` — 하단 고정 푸터 (약관, 개인정보, 관리자 링크)
- `evaluation-card` / `evaluation-stream` — 9명 평가관 실시간 SSE 스트리밍 카드
- `auth-guard` / `auth-provider` — Supabase 세션 기반 인증 래퍼 (role 노출)
- `ai-loader` — 전체화면 생성 중 오버레이 (Portal 기반)

## API 연동

`src/lib/api.ts` — FastAPI 호출 래퍼. 주요 메서드:

**자소서 생성/평가:**

- `analyzeJob(text)` — 채용공고 분석
- `generate({ question, job_posting, feedback?, previous_answer?, ... })` — 자소서 생성/재생성
- `evaluateStream(data, onEvaluator)` — SSE 스트리밍 평가
- `parseImage(file)` — 이미지/PDF 텍스트 추출

**프로젝트 CRUD:**

- `createProject` / `listProjects` / `getProject` / `updateProject` / `deleteProject`
- `createVersion` / `updateVersion` — 버전 관리
- `researchCompany(projectId)` — 회사 자동 조사

**이력서:**

- `listResumes` / `getResume` / `addResume` / `uploadResume` / `updateResume` / `deleteResume`

**유저/결제:**

- `getProfile` / `saveProfile` / `getUsage` / `changePlan`
- `billingAuth` / `getSubscription` / `cancelSubscription`
- `redeemCoupon` / `deleteAccount`
- `listActivity` — 통합 활동 피드

**관리자:**

- `getStats` / `listUsers` / `listGenerations` / `listResumes`
- `getSettings` / `updateSettings` / `changeUserPlan`
- `setExtraRegenerations` / `setExtraCompanySearches`
- `listCoupons` / `createCoupon`
