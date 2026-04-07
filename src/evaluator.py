"""LLM-as-a-Judge 평가 — 9명 평가관 (3그룹 × 3명), 동적 백그라운드, 병렬 실행"""

import asyncio
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv(Path(__file__).parent.parent / ".env")

async_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ──────────────────────────────────────────────
# 1. 페르소나 정의
# ──────────────────────────────────────────────

PERSONA_GROUPS = {
    "HR 인사담당자": {
        "role": "HR 인사담당자",
        "evaluators": [
            {
                "criteria": ["첫인상", "문단 구성", "문체 가독성"],
                "background": "대기업 인사팀 10년차. 연간 서류 3,000건 이상 검토. 형식과 기본기에 엄격하며, 첫 문장에서 합불을 가른다고 믿는 베테랑.",
                "focus": "오직 첫 문장과 문단 구성만 봅니다. 첫 문장이 지원자의 핵심 메시지를 즉시 전달하는지, 각 문단이 독립적으로 한 가지 포인트만 다루는지를 평가하세요. 두괄식이 아니거나 문단이 혼재되면 반드시 지적하세요.",
            },
            {
                "criteria": ["회사/직무 맞춤도", "복붙 여부", "구체적 사례 유무"],
                "background": "중견기업 채용담당 6년차. IT 직군 채용을 주로 담당. 지원자의 성의와 구체성을 중시하며, 복붙 자소서를 즉시 걸러내는 눈을 가짐.",
                "focus": "오직 맞춤 작성 여부만 봅니다. 회사 이름이나 직무명을 교체하면 다른 회사에도 쓸 수 있는 문장이 있는지, 채용공고의 특정 요구사항에 직접 응답한 구체적 사례가 있는지를 평가하세요. 범용 문장을 발견하면 해당 문장을 직접 인용하여 지적하세요.",
            },
            {
                "criteria": ["진정성", "개인 목소리", "공식체 남용"],
                "background": "스타트업 People팀 4년차. 빠르게 성장하는 조직에서 채용을 리드. 진정성 있는 스토리텔링을 높이 평가하며, 틀에 박힌 자소서를 싫어함.",
                "focus": "오직 진정성과 개인 목소리만 봅니다. '~하고자 합니다', '~할 수 있다고 생각합니다' 같은 공식체가 반복되는지, 지원자만의 개인적 경험·감정·실패담이 있는지를 평가하세요. 틀에 박힌 표현을 실제로 찾아 인용하고 왜 문제인지 설명하세요.",
            },
        ],
    },
    "현업 팀장": {
        "role": "현업 팀장",
        "evaluators": [
            {
                "criteria": ["기술 스택 일치율", "빠진 핵심 기술", "기술 깊이"],
                "background": "SI 기업 개발팀장 12년차. 다양한 프로젝트를 이끌며 수백 명의 지원자를 면접. 기술 깊이와 실제 문제 해결 경험을 중시.",
                "focus": "오직 기술 스택 매칭만 봅니다. 채용공고의 요구 역량 목록과 자소서에 등장한 기술을 직접 대조하세요. 언급됐지만 깊이가 없는 기술, 아예 언급되지 않은 필수 역량을 구체적으로 나열하세요.",
            },
            {
                "criteria": ["개인 기여도 명확성", "수치/결과 구체성", "팀 vs 개인 구분"],
                "background": "서비스 기업 백엔드 리드 8년차. 실무 역량을 최우선으로 보며, 프로젝트에서 본인이 실제로 한 일이 무엇인지를 날카롭게 파악.",
                "focus": "오직 개인 기여도만 봅니다. '팀에서 개발했습니다'처럼 개인 역할이 불분명한 문장을 찾아 인용하고, 수치가 없거나 막연한 결과 표현('성능 향상', '효율화')을 지적하세요. 수치가 있다면 맥락이 충분한지 확인하세요.",
            },
            {
                "criteria": ["문제 정의 명확성", "해결 과정 논리성", "결과 검증 여부"],
                "background": "금융IT 팀장 15년차. 안정성과 정확성을 중시하는 도메인 특성상, 체계적 사고력과 문서화 능력을 높이 평가.",
                "focus": "오직 문제 해결 사고 흐름만 봅니다. 문제를 어떻게 정의했는지, 왜 그 해결책을 선택했는지, 결과를 어떻게 검증했는지가 드러나는지 평가하세요. '~를 구현했습니다'처럼 과정 없이 결과만 나열된 부분을 찾아 지적하세요.",
            },
        ],
    },
    "채용 리더": {
        "role": "채용 리더",
        "evaluators": [
            {
                "criteria": ["자기주도 학습 증거", "기술 트렌드 대응", "성장 궤적"],
                "background": "IT기업 CTO 출신 임원. 스타트업부터 대기업까지 경험. 기술 트렌드에 밝으며, 지원자의 학습 능력과 잠재력을 중시.",
                "focus": "오직 성장 가능성만 봅니다. 최근 1~2년 내 스스로 새로운 기술을 학습한 구체적 증거가 있는지, 기술 트렌드 변화에 반응한 사례가 있는지 평가하세요. 과거 성과 나열에 그치고 '앞으로 하겠다'는 선언만 있는 경우 반드시 지적하세요.",
            },
            {
                "criteria": ["회사 비전 이해도", "지원동기 전략성", "단순 관심 vs 연구"],
                "background": "컨설팅펌 출신 VP. 전략적 사고와 구조화된 커뮤니케이션을 높이 평가. 지원동기에서 회사와 직무에 대한 이해도를 핵심적으로 봄.",
                "focus": "오직 지원동기의 전략적 깊이만 봅니다. 단순히 '이 회사에 관심이 있다'는 수준인지, 회사의 구체적 사업 방향·경쟁 포지션·기술 로드맵을 이해하고 본인의 커리어와 연결 지었는지 평가하세요. '함께 성장하고 싶습니다' 같은 막연한 동기 문장을 찾아 지적하세요.",
            },
            {
                "criteria": ["독보적 경험 유무", "차별화 포인트 명확성", "대체 가능성"],
                "background": "테크 리드 출신 채용위원장. 다양한 배경의 인재를 채용해본 경험. 남들과 다른 관점과 독창적 문제 해결 방식에 주목.",
                "focus": "오직 차별화 포인트만 봅니다. 이 자소서에서 다른 지원자도 쓸 법한 평범한 내용을 골라내세요. 지원자만이 가진 독특한 경험·조합·관점이 있는지, 아니면 스펙 나열에 그치는지 평가하세요. '저만의 강점은 ~입니다'처럼 선언만 있고 근거가 없는 경우 지적하세요.",
            },
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
        f"이 직무에서 중요한 키워드는 [{keywords}]입니다."
    )


EVAL_PROMPT_TEMPLATE = """당신은 {role}입니다.

## 당신의 배경
{background}

## 이번 평가의 관찰 포인트 (이것만 다루세요)
{focus}

## 엄격한 피드백 규칙
1. 위 관찰 포인트에 해당하는 내용만 다루세요. 다른 평가관의 영역(기술 역량, 지원동기, 성장 가능성 등)은 언급 금지.
2. 피드백에는 반드시 **이 자소서에서 실제로 부족하거나 아쉬운 점 1가지**를 구체적으로 지적하세요. 칭찬만 하는 피드백은 허용되지 않습니다.
3. 지적 시 "~하면 좋겠다" 같은 모호한 표현 말고, 자소서의 어느 부분이 왜 문제인지 직접 짚으세요.
4. "잘 작성되었습니다", "인상적입니다" 같은 일반적 칭찬 문구는 쓰지 마세요.

## 평가 기준
다음 항목을 각각 1~10점으로 평가하세요 (후한 점수 금지 — 평균 이상이면 7점이 최대):
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
    "{c1}": {{"score": 점수, "comment": "핵심 근거 20자 이내 (칭찬 금지)"}},
    "{c2}": {{"score": 점수, "comment": "핵심 근거 20자 이내 (칭찬 금지)"}},
    "{c3}": {{"score": 점수, "comment": "핵심 근거 20자 이내 (칭찬 금지)"}}
  }},
  "pass_probability": 통과확률(0~100),
  "feedback": "[약점] 이 자소서에서 관찰 포인트 기준으로 가장 아쉬운 점 한 가지를 날카롭게 지적하고, [개선 방향] 구체적으로 어떻게 고쳐야 하는지 제시하세요. 2~3문장."
}}

반드시 JSON만 출력하세요."""


# ──────────────────────────────────────────────
# 2. 단일 평가 실행
# ──────────────────────────────────────────────

async def _evaluate_single(
    role: str,
    background: str,
    criteria: list[str],
    focus: str,
    question: str,
    answer: str,
    job_analysis: dict,
) -> dict:
    """단일 페르소나로 평가를 실행한다."""
    prompt = EVAL_PROMPT_TEMPLATE.format(
        role=role,
        background=background,
        focus=focus,
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
        temperature=0.7,
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
        for i, evaluator in enumerate(group["evaluators"]):
            dynamic_bg = _build_dynamic_background(evaluator["background"], job_analysis)
            tasks.append(
                _evaluate_single(
                    role=group["role"],
                    background=dynamic_bg,
                    criteria=evaluator["criteria"],
                    focus=evaluator["focus"],
                    question=question,
                    answer=answer,
                    job_analysis=job_analysis,
                )
            )
            task_meta.append({
                "group": group_name,
                "criteria": evaluator["criteria"],
                "index": i,
                "background_short": evaluator["background"][:60],
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
            group_results[group] = {"evaluator_items": []}
        group_results[group]["evaluator_items"].append(item)

    summary = {"groups": {}, "overall_pass_probability": 0, "all_feedback": []}
    total_prob = 0
    prob_count = 0

    for group_name, data in group_results.items():
        # 평가관별로 각자의 criteria를 독립적으로 집계
        criteria_avg = {}
        evals_with_results = [it for it in data["evaluator_items"] if it["result"] and not it.get("error")]
        for item in evals_with_results:
            for criterion, score_data in item["result"].get("scores", {}).items():
                if criterion not in criteria_avg:
                    criteria_avg[criterion] = {"scores": [], "comments": []}
                if isinstance(score_data, dict):
                    criteria_avg[criterion]["scores"].append(score_data.get("score", 0))
                    if score_data.get("comment"):
                        criteria_avg[criterion]["comments"].append(score_data["comment"])

        if not criteria_avg:
            continue

        criteria_final = {}
        for criterion, agg in criteria_avg.items():
            scores = agg["scores"]
            criteria_final[criterion] = {
                "avg_score": round(sum(scores) / len(scores), 1) if scores else 0,
                "comments": agg["comments"],
            }

        all_results = [it["result"] for it in evals_with_results]
        probs = [e.get("pass_probability", 0) for e in all_results]
        avg_prob = sum(probs) / len(probs) if probs else 0
        total_prob += avg_prob * len(probs)
        prob_count += len(probs)

        feedbacks = [e.get("feedback", "") for e in all_results if e.get("feedback")]

        summary["groups"][group_name] = {
            "criteria": criteria_final,
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
    """평가 결과를 보기 좋게 포맷팅한다."""
    lines = [
        f"\n{'='*50}",
        f"  서류 통과 확률: {result['overall_pass_probability']}%",
        f"{'='*50}",
    ]

    for group_name, data in result["groups"].items():
        lines.append(f"\n┌ {group_name} (평균 통과확률: {data['avg_pass_probability']}%)")

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
    """재생성을 위해 피드백을 명확한 개선 지시 형태로 종합한다."""
    critical_items = []
    evaluator_feedbacks = []
    seen_fb: set[str] = set()

    for group_name, data in result["groups"].items():
        for criterion, info in data["criteria"].items():
            if info["avg_score"] < 7:
                comments = [c.strip() for c in info["comments"] if c.strip()][:2]
                comment_str = " / ".join(comments) if comments else "구체성 부족"
                critical_items.append(
                    f"- [{criterion}] 평균 {info['avg_score']}/10점 → {comment_str}"
                )
        for fb in data.get("feedbacks", []):
            if fb and fb.strip() not in seen_fb:
                seen_fb.add(fb.strip())
                evaluator_feedbacks.append(f"- [{group_name}] {fb.strip()}")

    parts = []
    if critical_items:
        parts.append("### 점수 낮은 항목 (반드시 개선)")
        parts.extend(critical_items)
    if evaluator_feedbacks:
        parts.append("\n### 평가관별 피드백 (관점별로 반영)")
        parts.extend(evaluator_feedbacks)

    return "\n".join(parts) if parts else ""
