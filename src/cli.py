"""CLI 진입점 — 전체 파이프라인을 하나의 명령어로 연결"""

import asyncio

import typer
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt, Confirm
from rich.table import Table


def _sync(coro):
    """async 코루틴을 동기적으로 실행한다."""
    return asyncio.run(coro)

app = typer.Typer(help="합격 자소서 기반 RAG 자소서 생성 + LLM-as-a-Judge 평가 CLI")
console = Console()


@app.command()
def generate(
    question: str = typer.Option(None, "--question", "-q", help="자소서 질문"),
    job_posting: str = typer.Option(None, "--job", "-j", help="채용공고 텍스트 또는 파일 경로"),
    resume: str = typer.Option(None, "--resume", "-r", help="이력��� (텍스트, 파일 경로, 또는 저장된 이름)"),
    char_limit: int = typer.Option(None, "--limit", "-l", help="글자수 제한"),
):
    """자소서 답변을 생성하고 평가합니다."""
    from src.analyzer import analyze_job_posting
    from src.evaluator import format_evaluation_result, run_evaluation, aggregate_feedback
    from src.generator import generate_answer
    from src.parser import get_resume_by_name, process_resume, read_input
    from src.retriever import search_similar

    # 1. 자소서 질문 입력
    if not question:
        question = Prompt.ask("[bold cyan]자소서 질문을 입력하세요[/]")

    # 2. 채용공고 입력
    if not job_posting:
        console.print("[bold cyan]채용공고를 붙여넣으세요[/] (빈 줄 2번으로 입력 종료):")
        job_posting = _multiline_input()

    job_text = read_input(job_posting) if job_posting else ""

    console.print("\n[dim]채용공고 분석 중...[/]")
    job_analysis = _sync(analyze_job_posting(job_text))
    console.print(f"  회사: [bold]{job_analysis.get('company', '?')}[/]")
    console.print(f"  직무: [bold]{job_analysis.get('position', '?')}[/]")
    console.print(f"  핵심 ���워드: {', '.join(job_analysis.get('keywords', []))}")

    # 3. 이력서 입력
    if not resume:
        resume = _get_resume_input()

    console.print("\n[dim]이력서 ��싱 중...[/]")
    resume_data = _resolve_resume(resume)
    console.print(f"  이름: [bold]{resume_data['structured'].get('name', '?')}[/]")

    # 4. RAG 검색
    from src.analyzer import build_search_query
    search_query = build_search_query(job_analysis, question)
    console.print("\n[dim]합격 자소서 검색 중...[/]")
    rag_results = _sync(search_similar(search_query, match_count=5))
    console.print(f"  {len(rag_results)}건의 유사 합격 자소서 찾음")

    # 5. 자소서 생성
    console.print("\n[dim]자소서 생성 중...[/]")
    answer = _sync(generate_answer(
        question=question,
        job_analysis=job_analysis,
        resume_structured=resume_data["structured"],
        rag_results=rag_results,
        char_limit=char_limit,
    ))

    console.print(Panel(answer, title="[bold green]생성된 자소서[/]", border_style="green"))
    if char_limit:
        console.print(f"  글자수: {len(answer)}/{char_limit}")

    # 6. 평가
    console.print("\n[dim]9명 평가관이 평가 중...[/]")
    eval_result = run_evaluation(question, answer, job_analysis)
    console.print(format_evaluation_result(eval_result))

    # 7. 재생성
    if eval_result["overall_pass_probability"] < 70 or Confirm.ask("\n[bold yellow]재생성 하시겠습니까?[/]", default=False):
        feedback = aggregate_feedback(eval_result)
        console.print("\n[dim]피드백 반영하여 재생성 중...[/]")
        improved = _sync(generate_answer(
            question=question,
            job_analysis=job_analysis,
            resume_structured=resume_data["structured"],
            rag_results=rag_results,
            char_limit=char_limit,
            feedback=feedback,
        ))
        console.print(Panel(improved, title="[bold blue]개선된 자소서[/]", border_style="blue"))
        if char_limit:
            console.print(f"  글자수: {len(improved)}/{char_limit}")

        console.print("\n[dim]재평가 중...[/]")
        eval_result2 = run_evaluation(question, improved, job_analysis)
        console.print(format_evaluation_result(eval_result2))


@app.command()
def embed():
    """합격 자소서 data.txt를 임베딩하여 Supabase에 저장합니다."""
    from src.embedder import run as run_embedder
    run_embedder()


@app.command()
def resumes():
    """저장된 이력서 목록을 조회합니다."""
    from src.parser import list_resumes

    data = _sync(list_resumes())
    if not data:
        console.print("[dim]저장된 이력서가 없습니다.[/]")
        return

    table = Table(title="저장된 이력서")
    table.add_column("ID", style="cyan")
    table.add_column("이름", style="bold")
    table.add_column("업데이트", style="dim")

    for r in data:
        table.add_row(str(r["id"]), r["name"], r.get("updated_at", "")[:10])

    console.print(table)


@app.command()
def add_resume(
    source: str = typer.Argument(help="이력서 (텍스트, 파일 경로)"),
    name: str = typer.Option(None, "--name", "-n", help="저장할 이름"),
):
    """이력서를 파싱하고 Supabase에 저장합니다."""
    from src.parser import process_resume

    console.print("[dim]이력서 파싱 중...[/]")
    result = _sync(process_resume(source, name))
    console.print(f"  저장 완료: [bold]{result['name']}[/] (ID: {result['id']})")


# ──────────────────────────────────────────────
# 헬퍼
# ──────────────────────────────────────────────

def _multiline_input() -> str:
    """여러 줄 입력을 받는다. 빈 줄 2번으로 종료."""
    lines = []
    empty_count = 0
    while True:
        try:
            line = input()
        except EOFError:
            break
        if line.strip() == "":
            empty_count += 1
            if empty_count >= 2:
                break
        else:
            empty_count = 0
        lines.append(line)
    return "\n".join(lines).strip()


def _get_resume_input() -> str:
    """이력서 입력 방식을 선택받는다."""
    from src.parser import list_resumes

    saved = _sync(list_resumes())
    if saved:
        console.print("\n[bold cyan]저장된 이력서:[/]")
        for r in saved:
            console.print(f"  [{r['id']}] {r['name']}")
        console.print(f"  [new] 새로 입력")

        choice = Prompt.ask("선택", default=str(saved[0]["id"]))
        if choice.lower() != "new":
            return f"__saved__{choice}"

    console.print("[bold cyan]��력서를 붙여넣으세요[/] (빈 줄 2번으로 입력 종료):")
    return _multiline_input()


def _resolve_resume(source: str) -> dict:
    """이력서 소스를 resolve한다 (저장�� 것 또는 새 입력)."""
    from src.parser import get_resume, get_resume_by_name, process_resume

    if source.startswith("__saved__"):
        resume_id = int(source.replace("__saved__", ""))
        data = _sync(get_resume(resume_id))
        return {"id": data["id"], "name": data["name"], "structured": data["structured_data"]}

    # 이름으로 찾기
    existing = _sync(get_resume_by_name(source))
    if existing:
        return {"id": existing["id"], "name": existing["name"], "structured": existing["structured_data"]}

    # 새 이력서
    return _sync(process_resume(source))


if __name__ == "__main__":
    app()
