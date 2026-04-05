"""data.txt → 마크다운 포맷 → Parent-Child Chunking → 임베딩 → Supabase 저장"""

import os
import re
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client

load_dotenv(Path(__file__).parent.parent / ".env")

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

HEADER_PATTERN = re.compile(r"^(.+?)\s*/\s*(.+?)\s*/\s*(202\d.+)$")
QUESTION_PATTERN = re.compile(r"^(\d+)\.\s*(.+)")

QUESTION_TYPE_KEYWORDS = {
    "직무역량": ["직무", "역량", "경쟁력", "전문성", "강점", "보유", "스킬", "지식", "기술"],
    "지원동기": ["지원", "동기", "이유", "포부", "입사", "근무", "커리어", "성장"],
    "경험/프로젝트": ["경험", "프로젝트", "활동", "수행", "업무", "경력"],
    "실패/극복": ["실패", "극복", "어려움", "위기", "문제", "해결", "갈등"],
    "도전/성취": ["도전", "목표", "성취", "몰입", "열정", "노력", "끈질기"],
    "팀워크": ["팀", "협업", "협력", "소통", "팀워크", "공동", "함께"],
    "성격/가치관": ["성격", "장점", "단점", "가치관", "성장과정", "고치고"],
    "사회활동": ["봉사", "사회", "활동"],
}


def classify_question(question: str) -> str:
    """질문 텍스트를 분석하여 유형을 분류한다."""
    scores = {
        q_type: sum(1 for kw in keywords if kw in question)
        for q_type, keywords in QUESTION_TYPE_KEYWORDS.items()
    }
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "기타"


# ──────────────────────────────────────────────
# 1. 파싱: data.txt → 엔트리(회사별) 리스트
# ──────────────────────────────────────────────

def parse_data_file(file_path: str) -> list[dict]:
    """data.txt를 회사별 엔트리로 파싱한다. 각 엔트리에 Q&A 리스트 포함."""
    text = Path(file_path).read_text(encoding="utf-8")
    lines = text.split("\n")

    entries = []
    current = None
    current_qa = None

    def flush_qa():
        nonlocal current_qa
        if current_qa and current:
            answer = "\n".join(current_qa["answer_lines"]).strip()
            if len(answer) > 30:
                current_qa["answer"] = answer
                current_qa["question_type"] = classify_question(current_qa["question"])
                del current_qa["answer_lines"]
                current["qas"].append(current_qa)
        current_qa = None

    def flush_entry():
        nonlocal current
        flush_qa()
        if current and current["qas"]:
            entries.append(current)
        current = None

    for line in lines:
        stripped = line.strip()

        # 헤더 라인 (회사 / 직무 / 연도)
        header_match = HEADER_PATTERN.match(stripped)
        if header_match:
            flush_entry()
            current = {
                "company": header_match.group(1).strip(),
                "job_position": header_match.group(2).strip(),
                "year": header_match.group(3).strip(),
                "specs": "",
                "qas": [],
            }
            continue

        if not current:
            continue

        # 스펙 라인 (헤더 직후)
        if not current["specs"] and not current["qas"] and current_qa is None:
            if stripped and not QUESTION_PATTERN.match(stripped):
                current["specs"] = stripped
                continue

        # 번호 있는 질문
        q_match = QUESTION_PATTERN.match(stripped)
        if q_match:
            flush_qa()
            current_qa = {
                "question_num": q_match.group(1),
                "question": q_match.group(2),
                "answer_lines": [],
            }
            continue

        # 번호 없는 섹션 헤더
        if (
            stripped
            and current_qa is None
            and current["specs"]
            and len(stripped) < 50
            and not stripped.startswith(("※", "[", "("))
        ):
            flush_qa()
            current_qa = {
                "question_num": "",
                "question": stripped,
                "answer_lines": [],
            }
            continue

        # 답변 본문
        if current_qa is not None:
            current_qa["answer_lines"].append(line)

    flush_entry()
    return entries


# ──────────────────────────────────────────────
# 2. 마크다운 포맷팅
# ──────────────────────────────────────────────

def format_parent_markdown(entry: dict) -> str:
    """엔트리 전체를 Parent 마크다운으로 포맷팅한다."""
    lines = [
        f"# {entry['company']} / {entry['job_position']}",
        "",
        f"- **연도:** {entry['year']}",
        f"- **스펙:** {entry['specs']}",
        "",
    ]
    for qa in entry["qas"]:
        q_num = f"Q{qa['question_num']}. " if qa["question_num"] else ""
        lines.append(f"## {q_num}{qa['question']}")
        lines.append("")
        lines.append(qa["answer"])
        lines.append("")
    return "\n".join(lines).strip()


def format_child_markdown(entry: dict, qa: dict) -> str:
    """개별 Q&A를 Child 마크다운으로 포맷팅한다."""
    q_num = f"Q{qa['question_num']}. " if qa["question_num"] else ""
    return "\n".join([
        f"# {entry['company']} / {entry['job_position']}",
        "",
        f"> **연도:** {entry['year']}  ",
        f"> **질문 유형:** {qa['question_type']}",
        "",
        f"## 질문",
        f"{q_num}{qa['question']}",
        "",
        f"## 답변",
        qa["answer"],
    ]).strip()


# ──────────────────────────────────────────────
# 3. 임베딩 + Supabase 저장
# ──────────────────────────────────────────────

def get_embedding(text: str) -> list[float]:
    """텍스트를 임베딩 벡터로 변환한다."""
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text[:8000],
    )
    return response.data[0].embedding


def store_parent_child(entries: list[dict]) -> dict:
    """Parent-Child Chunking으로 임베딩 후 Supabase에 저장한다."""
    stats = {"parents": 0, "children": 0}

    for entry in entries:
        # ── Parent 저장 (임베딩 없음, 컨텍스트용) ──
        parent_md = format_parent_markdown(entry)
        parent_result = supabase.table("documents").insert({
            "company": entry["company"],
            "job_position": entry["job_position"],
            "question_type": "parent",
            "question": f"{entry['company']} / {entry['job_position']} 전체",
            "answer": parent_md,
            "metadata": {
                "year": entry["year"],
                "specs": entry["specs"],
                "role": "parent",
                "child_count": len(entry["qas"]),
            },
            "parent_id": None,
        }).execute()

        parent_id = parent_result.data[0]["id"]
        stats["parents"] += 1
        print(f"  [Parent] {entry['company']} / {entry['job_position']} ({len(entry['qas'])} QAs)")

        # ── Child 저장 (임베딩 있음, 검색 대상) ──
        for qa in entry["qas"]:
            child_md = format_child_markdown(entry, qa)
            embedding = get_embedding(child_md)

            supabase.table("documents").insert({
                "company": entry["company"],
                "job_position": entry["job_position"],
                "question_type": qa["question_type"],
                "question": qa["question"],
                "answer": child_md,
                "metadata": {
                    "year": entry["year"],
                    "specs": entry["specs"],
                    "question_num": qa["question_num"],
                    "role": "child",
                },
                "embedding": embedding,
                "parent_id": parent_id,
            }).execute()

            stats["children"] += 1
            q_num = qa.get("question_num", "?")
            print(f"    [Child {stats['children']}] Q{q_num} - {qa['question_type']}")

    return stats


# ──────────────────────────────────────────────
# 4. 실행
# ──────────────────────────────────────────────

def run(data_path: str = "data/data.txt"):
    """전체 임베딩 파이프라인을 실행한다."""
    file_path = Path(__file__).parent.parent / data_path

    print(f"1. Parsing {file_path}...")
    entries = parse_data_file(str(file_path))
    total_qas = sum(len(e["qas"]) for e in entries)
    print(f"   -> {len(entries)} entries, {total_qas} Q&A pairs")

    # 샘플 확인
    print("\n2. Sample Parent markdown:")
    print("=" * 60)
    print(format_parent_markdown(entries[0])[:500])
    print("..." if len(format_parent_markdown(entries[0])) > 500 else "")
    print("=" * 60)

    print("\n   Sample Child markdown:")
    print("-" * 60)
    sample_child = format_child_markdown(entries[0], entries[0]["qas"][0])
    print(sample_child[:400])
    print("..." if len(sample_child) > 400 else "")
    print("-" * 60)

    print(f"\n3. Embedding & storing (Parent-Child)...")
    stats = store_parent_child(entries)
    print(f"\nDone! {stats['parents']} parents + {stats['children']} children stored.")


if __name__ == "__main__":
    run()
