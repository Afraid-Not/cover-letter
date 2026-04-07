"""회사명 → OpenAI web search → 미션/비전/제품·서비스 조사"""

import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).parent.parent / ".env")

_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

_PROMPT = """{company} 회사에 대해 다음 세 가지 정보를 조사해줘:
1. 미션(Mission): 이 회사가 존재하는 이유, 핵심 목적
2. 비전(Vision): 이 회사가 지향하는 미래 목표
3. 주요 제품/서비스: 이 회사가 판매하거나 제공하는 핵심 제품과 서비스

반드시 아래 JSON 형식으로만 답변해. 설명 없이 JSON만 출력해:
{{
  "mission": "...",
  "vision": "...",
  "products_services": "..."
}}

정보를 찾을 수 없으면 해당 필드에 null을 넣어줘."""


def research_company(company: str) -> dict:
    """회사 미션/비전/제품·서비스를 웹 검색으로 조사한다."""
    if not company or company in ("미확인", ""):
        return {"mission": None, "vision": None, "products_services": None}

    try:
        response = _client.responses.create(
            model="gpt-4o",
            tools=[{"type": "web_search_preview"}],
            input=_PROMPT.format(company=company),
        )
        raw = response.output_text.strip()

        # JSON 블록 추출 (```json ... ``` 감싸진 경우 대응)
        match = re.search(r"\{[\s\S]*\}", raw)
        if match:
            data = json.loads(match.group())
            return {
                "mission": data.get("mission"),
                "vision": data.get("vision"),
                "products_services": data.get("products_services"),
            }
    except Exception:
        pass

    return {"mission": None, "vision": None, "products_services": None}
