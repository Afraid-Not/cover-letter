# AURA — Cover Letter Generator

## 프로젝트 개요

합격 자소서 기반 RAG + LLM-as-a-Judge 9명 평가 자소서 생성 풀스택 앱.

## 기술 스택

- **백엔드**: Python 3.11, FastAPI, OpenAI API (GPT-4o), Supabase (pgvector)
- **프론트엔드**: Next.js 16, shadcn/ui, Tailwind CSS
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
├── api/main.py              # FastAPI — REST + SSE 스트리밍 + 프로젝트 CRUD
├── src/
│   ├── embedder.py           # data.txt → Parent-Child 청킹 → 임베딩 → Supabase
│   ├── parser.py             # 이력서 파싱 (텍스트/PDF) → 구조화 → Supabase 저장
│   ├── analyzer.py           # 채용공고 텍스트 → 요구 역량/키워드 추출
│   ├── retriever.py          # Supabase 벡터 유사도 검색 (Child 검색 + Parent 컨텍스트)
│   ├── generator.py          # RAG + 이력서 + 채용공고 → 자소서 생성
│   ├── evaluator.py          # 9명 LLM-as-a-Judge 병렬 평가 + SSE 스트리밍
│   └── cli.py                # Typer CLI (프론트 없이 사용 가능)
├── frontend/                 # Next.js 16 대시보드
│   └── src/
│       ├── app/              # 페이지: /, /login, /history, /projects/[id], /resumes
│       ├── components/       # app-shell, sidebar, auth-guard/provider, evaluation-card/stream
│       └── lib/              # api.ts (FastAPI 호출 + 프로젝트 CRUD), supabase.ts
├── email-templates/          # Supabase Auth 이메일 템플릿 (가입 인증)
├── data/data.txt             # 합격 자소서 39건 원본
├── pyproject.toml            # Python 프로젝트 설정 + 의존성
├── .env                      # SUPABASE_URL, SUPABASE_KEY, OPENAI_API_KEY
├── frontend/.env.local       # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
└── PLAN.md                   # 상세 기획 문서
```

## Supabase 테이블

- `documents` — 합격 자소서 청크 (Parent-Child, parent_id로 연결)
- `resumes` — 사용자 이력서 (user_id + RLS)
- `generations` — 생성 이력 (자소서 + 평가 결과, user_id + RLS)

## 주요 설계 결정

- 채용공고 URL 스크래핑 안 함 → 텍스트 복붙 또는 스크린샷(GPT-4o Vision) 업로드
- Parent-Child Chunking: Child(Q&A)에서 검색, Parent(전체)로 컨텍스트 제공
- 9명 평가관: 3그룹(HR/현업팀장/채용리더) × 3명, 채용공고 기반 동적 백그라운드
- 평가 SSE 스트리밍: 각 평가관 결과를 실시간으로 프론트에 전달
- Supabase Auth + RLS: 사용자별 데이터 격리

## UI 디자인

- **테마**: Soft/Pastel 다크 — 라벤더/바이올렛 톤 (primary hue 290)
- **사이드바**: hover 시 펼침 (64px → 220px), 고정 position
- **프로젝트 카드**: 고정 높이, 좌측 상태 액센트 바, 부드러운 그림자
- **결과 레이아웃**: 2-Column (자소서+피드백 좌 / 통과확률+평가카드 우)
- **콘텐츠 영역**: max-w-7xl, 넓은 레이아웃
- **상태 컬러**: draft(gray), ready(sky), generated(amber), evaluated(emerald)
- **서비스명**: AURA

## 프로젝트 플로우

- 메인 대시보드(`/`) → 프로젝트 카드 목록 (status: draft/ready/generated/evaluated)
- 프로젝트 생성 → 채용공고 입력 → 자동 분석 → 분석 결과 확인/수정 모달 → `/projects/[id]`로 이동
- 프로젝트 상세(`/projects/[id]`) → 4단계 위자드: 채용공고 → 이력서 → 작성설정 → 결과
- Step 1에서 분석 결과(회사/직무/역량/키워드) 인라인 수정 가능
- 회사명/직무 미입력 시 다음 단계 진행 불가
- 프로젝트 데이터는 `generations` 테이블 재사용 (별도 테이블 없음)

## 코드 컨벤션

- Python: 타입 힌트 사용
- TypeScript: arrow function 사용, shadcn/ui 컴포넌트 기반
- 커밋 메시지: 한국어 가능, Co-Authored-By 포함
