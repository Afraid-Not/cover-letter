"""LLM-as-a-Judge 평가 — 9명 평가관 (3그룹 × 3명), 동적 백그라운드, 병렬 실행"""

import asyncio
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv(Path(__file__).parent.parent / ".env")

async_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ──────────────────────────────────────��───────
# 1. 페르소나 정의
# ──────────────────────────────────────────────

PERSONA_GROUPS = {
    "HR 인사담당자": {
        "role": "HR 인사담당자",
        "criteria": ["문체 자연스러움", "글 구조", "질문 의도 부합"],
        "backgrounds": [
            "대기업 인사팀 10년차. 연간 서류 3,000건 이상 검토. 형식과 기본기에 엄격하며, 첫 문장에서 합불을 가른다고 믿는 베테랑.",
            "중견기업 채용담당 6��차. IT 직군 채용을 주로 담당. 지원자의 성의와 구체성을 중시하며, 복붙 자소서를 즉시 걸러내는 눈을 가짐.",
            "스타트업 People팀 4년차. 빠르게 성장하는 조직에서 채용을 리드. 진정성 있는 스토리텔링을 높이 평가하며, 틀에 박힌 자소서를 싫어함.",
        ],
    },
    "현업 팀장": {
        "role": "현업 팀장",
        "criteria": ["기술 역량 매칭", "경험 구체성", "직무 이해도"],
        "backgrounds": [
            "SI 기업 개발팀장 12년차. 다양��� 프로젝트를 이끌며 수백 명의 지원자를 면접. 기술 깊이와 실제 문제 해결 경험을 중시.",
            "서비스 기업 백엔드 리드 8년차. 실무 역량을 최우선으로 보며, 프로젝트에서 본인이 실제로 한 일이 무엇인지를 날카롭게 파악.",
            "금융IT 팀장 15년차. 안정성과 정확성을 중시하는 도메인 특성상, 체계적 사고력과 문서화 능력을 높이 평가.",
        ],
    },
    "채용 리더": {
        "role": "채용 리더",
        "criteria": ["성장 가능성", "지원동기 진정성", "차별화 포인트"],
        "backgrounds": [
            "IT기업 CTO 출신 임원. 스타트���부터 대기업까지 경험. 기술 트렌드에 밝으며, 지원자의 학습 능력��� 잠재력을 중시.",
            "컨설팅펌 출신 VP. 전략적 사고와 구조화된 커뮤니케이션을 높이 평가. 지원동기에서 회사와 직무에 대한 이해도를 핵심적으로 봄.",
            "테크 리드 출신 채용위원장. 다양한 배경의 인재를 채용해본 경험. 남들과 다른 관점과 독창적 문제 해결 방식에 주목.",
        ],
    },
}


def _build_dynamic_background(base_bg: str, job_analysis: dict) -> str:
    """채용공고에 맞게 백그라운드를 동적으로 조정한다."""
    company = job_analysis.get("company", "")
    position = job_analysis.get("position", "")
    keywords = ", ".join(job_analysis.get("keywords", [])[:5])

    return (
        f"{base_bg}\n"
        f"현재 {company}의 {position} 직무 서류를 심사 중이며, "
        f"이 직무에서 중요한 ��워드는 [{keywords}]입니다."
    )


EVAL_PROMPT_TEMPLATE = """당신은 {role}입니다.

## 당신의 배경
{background}

## 평가 기준
다음 항목을 각각 1~10점으로 평가하세요:
{criteria_list}

## 평가 대상
### 자소서 질문
{question}

### 채용공고 요약
- 회사: {company}
- 직무: {position}
- 요구 역량: {required_skills}

### 자소서 답변
{answer}

## 출력 형식 (JSON)
{{
  "scores": {{
    "{c1}": {{"score": 점수, "comment": "한줄 코멘트"}},
    "{c2}": {{"score": 점수, "comment": "한줄 코멘트"}},
    "{c3}": {{"score": 점수, "comment": "한줄 코멘트"}}
  }},
  "pass_probability": 통과확률(0~100),
  "feedback": "개선을 위한 구체적 피드백 1~2문장"
}}

반드시 JSON만 출력하세요."""


# ──────────────────────────────────────────────
# 2. 단일 평가 실행
# ──────────────────────────────────────────────

async def _evaluate_single(
    role: str,
    background: str,
    criteria: list[str],
    question: str,
    answer: str,
    job_analysis: dict,
) -> dict:
    """단일 페르소나로 평가를 실행한다."""
    prompt = EVAL_PROMPT_TEMPLATE.format(
        role=role,
        background=background,
        criteria_list="\n".join(f"- {c}" for c in criteria),
        question=question,
        company=job_analysis.get("company", ""),
        position=job_analysis.get("position", ""),
        required_skills=", ".join(
            job_analysis.get("required_skills", []) + job_analysis.get("preferred_skills", [])
        ),
        answer=answer,
        c1=criteria[0],
        c2=criteria[1],
        c3=criteria[2],
    )

    response = await async_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.3,
    )

    return json.loads(response.choices[0].message.content)


# ──────────────────────────────────────────────
# 3. 9명 병렬 평가
# ──────────────────────────────────────────────

def _build_tasks(question: str, answer: str, job_analysis: dict):
    """평가 태스크와 메타데이터를 생성한다."""
    tasks = []
    task_meta = []
    for group_name, group in PERSONA_GROUPS.items():
        for i, bg in enumerate(group["backgrounds"]):
            dynamic_bg = _build_dynamic_background(bg, job_analysis)
            tasks.append(
                _evaluate_single(
                    role=group["role"],
                    background=dynamic_bg,
                    criteria=group["criteria"],
                    question=question,
                    answer=answer,
                    job_analysis=job_analysis,
                )
            )
            task_meta.append({
                "group": group_name,
                "criteria": group["criteria"],
                "index": i,
                "background_short": bg[:60],
            })
    return tasks, task_meta


async def evaluate_stream(question: str, answer: str, job_analysis: dict):
    """9명 평가관 결과를 하나씩 yield하는 async generator."""
    tasks, task_meta = _build_tasks(question, answer, job_analysis)

    async def _wrapped(idx: int):
        """메타데이터를 포함해서 결과를 반환하는 래퍼."""
        try:
            result = await tasks[idx]
            return {"meta": task_meta[idx], "result": result, "error": None}
        except Exception as e:
            return {"meta": task_meta[idx], "result": None, "error": str(e)}

    # 완료 순서대로 yield
    pending = {asyncio.ensure_future(_wrapped(i)): i for i in range(len(tasks))}
    while pending:
        done, _ = await asyncio.wait(pending.keys(), return_when=asyncio.FIRST_COMPLETED)
        for future in done:
            pending.pop(future)
            yield future.result()


def _summarize_results(items: list[dict]) -> dict:
    """스트리밍 또는 gather 결과를 그룹별로 집계한다.
    items: [{"meta": {...}, "result": {...}, "error": ...}, ...]
    """
    group_results = {}
    for item in items:
        meta = item["meta"]
        result = item["result"]
        group = meta["group"]
        if group not in group_results:
            group_results[group] = {"evaluations": [], "criteria": meta["criteria"]}
        if result and not item.get("error"):
            group_results[group]["evaluations"].append(result)

    summary = {"groups": {}, "overall_pass_probability": 0, "all_feedback": []}
    total_prob = 0
    prob_count = 0

    for group_name, data in group_results.items():
        evals = data["evaluations"]
        if not evals:
            continue

        criteria_avg = {}
        for criterion in data["criteria"]:
            scores = [
                e["scores"][criterion]["score"]
                for e in evals
                if criterion in e.get("scores", {})
            ]
            comments = [
                e["scores"][criterion]["comment"]
                for e in evals
                if criterion in e.get("scores", {})
            ]
            criteria_avg[criterion] = {
                "avg_score": round(sum(scores) / len(scores), 1) if scores else 0,
                "comments": comments,
            }

        probs = [e.get("pass_probability", 0) for e in evals]
        avg_prob = sum(probs) / len(probs) if probs else 0
        total_prob += avg_prob * len(probs)
        prob_count += len(probs)

        feedbacks = [e.get("feedback", "") for e in evals if e.get("feedback")]

        summary["groups"][group_name] = {
            "criteria": criteria_avg,
            "avg_pass_probability": round(avg_prob, 1),
            "feedbacks": feedbacks,
        }
        summary["all_feedback"].extend(feedbacks)

    summary["overall_pass_probability"] = round(total_prob / prob_count, 1) if prob_count else 0
    return summary


async def evaluate_all(
    question: str,
    answer: str,
    job_analysis: dict,
) -> dict:
    """9명 평가관이 병렬로 평가하고 그룹별 평균을 산출한다."""
    tasks, task_meta = _build_tasks(question, answer, job_analysis)
    results = await asyncio.gather(*tasks, return_exceptions=True)

    items = []
    for meta, result in zip(task_meta, results):
        if isinstance(result, Exception):
            items.append({"meta": meta, "result": None, "error": str(result)})
        else:
            items.append({"meta": meta, "result": result, "error": None})

    return _summarize_results(items)


def run_evaluation(question: str, answer: str, job_analysis: dict) -> dict:
    """동기 래퍼 — asyncio 이벤트 루프를 실행한다."""
    return asyncio.run(evaluate_all(question, answer, job_analysis))


def format_evaluation_result(result: dict) -> str:
    """평가 결과를 보기 좋�� 포맷팅한다."""
    lines = [
        f"\n{'='*50}",
        f"  서류 통과 확률: {result['overall_pass_probability']}%",
        f"{'='*50}",
    ]

    for group_name, data in result["groups"].items():
        lines.append(f"\n┌ {group_name} (평�� 통과확률: {data['avg_pass_probability']}%)")

        for criterion, info in data["criteria"].items():
            lines.append(f"│  {criterion}: {info['avg_score']}/10")
            if info["comments"]:
                lines.append(f"│    └ {info['comments'][0]}")

        lines.append("│")

    lines.append(f"\n주요 피드백:")
    seen = set()
    for fb in result["all_feedback"]:
        if fb not in seen:
            lines.append(f"  - {fb}")
            seen.add(fb)

    return "\n".join(lines)


def aggregate_feedback(result: dict) -> str:
    """재생성을 위해 피드백을 종합한다."""
    feedbacks = []
    for group_name, data in result["groups"].items():
        for criterion, info in data["criteria"].items():
            if info["avg_score"] < 7:
                feedbacks.append(
                    f"[{group_name} - {criterion}] 점수 {info['avg_score']}/10. "
                    f"코멘트: {'; '.join(info['comments'][:2])}"
                )
        feedbacks.extend(data.get("feedbacks", []))

    return "\n".join(feedbacks) if feedbacks else ""
