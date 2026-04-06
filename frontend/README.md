# AURA — Frontend

AURA 자소서 생성 서비스의 Next.js 프론트엔드입니다.

## 기술 스택

- **Next.js 16** (App Router)
- **shadcn/ui** + **Tailwind CSS** — Soft/Pastel 다크 테마 (라벤더/바이올렛, primary hue 290)
- **Supabase JS** — Auth 세션 관리, RLS

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

| 경로               | 설명                                            |
| ------------------ | ----------------------------------------------- |
| `/`                | 프로젝트 대시보드 — 카드 목록, 새 프로젝트 생성 |
| `/projects/[id]`   | 4단계 위자드: 채용공고 → 이력서 → 설정 → 결과   |
| `/resumes`         | 이력서 관리                                     |
| `/history`         | 생성 이력                                       |
| `/login` `/signup` | 인증                                            |

## 주요 컴포넌트

- `app-shell` / `sidebar` — 레이아웃, hover 시 64px → 220px 펼침
- `evaluation-card` / `evaluation-stream` — 9명 평가관 실시간 SSE 스트리밍 카드
- `auth-guard` / `auth-provider` — Supabase 세션 기반 인증 래퍼

## API 연동

`src/lib/api.ts` — FastAPI(`localhost:8000`) 호출 래퍼. 주요 메서드:

- `api.generate({ ..., feedback?, previous_answer? })` — 자소서 생성/재생성
- `api.evaluateStream(data, onEvaluator)` — SSE 스트리밍 평가
- `api.createProject` / `updateProject` / `deleteProject` — 프로젝트 CRUD
