"""회사 정보 조회 — 캐시(companies 테이블) 우선, 미스 시 web search + DART API 후 저장"""

import json
import logging
import os
import re
import unicodedata
from pathlib import Path

import requests
from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client
from tavily import TavilyClient

logger = logging.getLogger(__name__)

load_dotenv(Path(__file__).parent.parent / ".env")

_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
_supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
_tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
_DART_KEY = os.getenv("DART_API_KEY", "")

_SIMILARITY_THRESHOLD = 0.92

_RESEARCH_PROMPT = """{company} 회사에 대해 다음 정보를 조사해줘:
1. 미션(Mission): 이 회사가 존재하는 이유, 핵심 목적
2. 비전(Vision): 이 회사가 지향하는 미래 목표
3. 주요 제품/서비스: 이 회사가 판매하거나 제공하는 핵심 제품과 서비스
4. 직원 수: 최신 공시 또는 기사 기준 전체 임직원 수 (숫자만)
5. 연간 매출: 최신 연간 매출 (억원 단위 숫자만, 모르면 null)
6. 기업 분류: 아래 기준으로 정확히 하나만 선택
   - 대기업: 직원 1000명 이상 OR 매출 10000억 이상
   - 중견기업: 직원 300~999명 OR 매출 1000~9999억
   - 중소기업: 직원 10~299명 OR 매출 10~999억
   - 소기업: 직원 5~9명 OR 매출 1~9억
   - 5인미만: 직원 5명 미만

반드시 아래 JSON 형식으로만 답변해. 설명 없이 JSON만 출력해:
{{
  "mission": "...",
  "vision": "...",
  "products_services": "...",
  "employee_count": 숫자 또는 null,
  "revenue_billion": 숫자 또는 null,
  "company_size": "대기업|중견기업|중소기업|소기업|5인미만" 또는 null
}}

정보를 찾을 수 없으면 해당 필드에 null을 넣어줘."""


def _normalize(name: str) -> str:
    """회사명 정규화: NFKC 유니코드 정규화 → 소문자 → 영숫자·한글만 유지"""
    name = unicodedata.normalize("NFKC", name).lower()
    return re.sub(r"[^a-z0-9가-힣]", "", name)


def _get_embedding(text: str) -> list[float]:
    response = _client.embeddings.create(
        model="text-embedding-3-small",
        input=text[:500],
    )
    return response.data[0].embedding


def _find_cached(name: str) -> dict | None:
    """1단계 정규화 완전 일치 → 2단계 임베딩 유사도 순으로 캐시 조회"""
    normalized = _normalize(name)

    # 1단계: 정규화 완전 일치
    exact = _supabase.table("companies").select("*").eq("name_normalized", normalized).limit(1).execute()
    if exact.data:
        return exact.data[0]

    # 2단계: 임베딩 유사도 (match_companies RPC)
    try:
        embedding = _get_embedding(name)
        similar = _supabase.rpc("match_companies", {
            "query_embedding": embedding,
            "match_threshold": _SIMILARITY_THRESHOLD,
            "match_count": 1,
        }).execute()
        if similar.data:
            return similar.data[0]
    except Exception as e:
        logger.warning("[researcher] 임베딩 유사도 캐시 조회 실패: %s", e)

    return None


def _research_web(company: str) -> dict:
    """Tavily 검색 → gpt-4o로 회사 정보를 구조화한다."""
    empty = {
        "mission": None, "vision": None, "products_services": None,
        "employee_count": None, "revenue_billion": None, "company_size": None,
    }
    try:
        # 1단계: Tavily로 회사 정보 검색
        search_result = _tavily.search(
            query=f"{company} 회사 미션 비전 사업 직원수 매출",
            search_depth="basic",
            max_results=5,
        )
        snippets = "\n\n".join(
            f"[{r.get('title', '')}]\n{r.get('content', '')}"
            for r in search_result.get("results", [])
        )
        logger.debug("[researcher] Tavily 검색 결과 (%s):\n%s", company, snippets[:500])

        if not snippets:
            logger.warning("[researcher] Tavily 검색 결과 없음: %s", company)
            return empty

        # 2단계: gpt-4o로 구조화
        prompt = _RESEARCH_PROMPT.format(company=company)
        messages = [
            {"role": "system", "content": "당신은 기업 정보를 JSON으로 정리하는 전문가입니다."},
            {"role": "user", "content": f"아래는 '{company}'에 대한 검색 결과입니다:\n\n{snippets}\n\n---\n\n{prompt}"},
        ]
        response = _client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0,
        )
        raw = response.choices[0].message.content.strip()
        logger.debug("[researcher] gpt-4o 응답:\n%s", raw)

        match = re.search(r"\{[\s\S]*\}", raw)
        if not match:
            logger.warning("[researcher] JSON 파싱 실패 — 원본: %s", raw[:300])
            return empty
        data = json.loads(match.group())
        logger.info("[researcher] '%s' 조사 완료: %s", company, data)
        return {
            "mission": data.get("mission"),
            "vision": data.get("vision"),
            "products_services": data.get("products_services"),
            "employee_count": data.get("employee_count"),
            "revenue_billion": data.get("revenue_billion"),
            "company_size": data.get("company_size"),
        }
    except json.JSONDecodeError as e:
        logger.error("[researcher] JSON 디코딩 오류: %s", e)
    except Exception as e:
        logger.error("[researcher] 웹서치 실패 (%s): %s", company, e, exc_info=True)
    return empty


def _dart_get_company_size(company: str) -> dict:
    """DART API로 상장기업 직원수·매출 조회. 미상장이면 빈 dict 반환."""
    if not _DART_KEY:
        return {}
    try:
        # 1단계: 기업코드 검색
        search_resp = requests.get(
            "https://opendart.fss.or.kr/api/corpSearch.json",
            params={"crtfc_key": _DART_KEY, "corp_name": company, "page_no": 1, "page_count": 5},
            timeout=5,
        )
        search_data = search_resp.json()
        if search_data.get("status") != "000" or not search_data.get("list"):
            return {}

        # 가장 일치도 높은 기업 선택 (정확히 이름이 같은 것 우선)
        candidates = search_data["list"]
        corp_code = None
        for c in candidates:
            if c.get("corp_name") == company:
                corp_code = c["corp_code"]
                break
        if not corp_code:
            corp_code = candidates[0]["corp_code"]

        # 2단계: 직원현황 조회 (최근 사업보고서)
        import datetime
        bsns_year = str(datetime.date.today().year - 1)
        emp_resp = requests.get(
            "https://opendart.fss.or.kr/api/empSttus.json",
            params={
                "crtfc_key": _DART_KEY,
                "corp_code": corp_code,
                "bsns_year": bsns_year,
                "reprt_code": "11011",  # 사업보고서
            },
            timeout=5,
        )
        emp_data = emp_resp.json()
        employee_count = None
        if emp_data.get("status") == "000" and emp_data.get("list"):
            # 전체 직원수 합산 (남+여+기간제)
            total = 0
            for row in emp_data["list"]:
                try:
                    total += int(str(row.get("fyer_cn", "0")).replace(",", "") or 0)
                except ValueError:
                    pass
            if total > 0:
                employee_count = total

        # 3단계: 매출 조회 (손익계산서 매출액)
        revenue_billion = None
        fin_resp = requests.get(
            "https://opendart.fss.or.kr/api/fnlttSinglAcnt.json",
            params={
                "crtfc_key": _DART_KEY,
                "corp_code": corp_code,
                "bsns_year": bsns_year,
                "reprt_code": "11011",
                "fs_div": "CFS",   # 연결재무제표 우선
                "sj_div": "IS",    # 손익계산서
            },
            timeout=5,
        )
        fin_data = fin_resp.json()
        if fin_data.get("status") == "000" and fin_data.get("list"):
            for row in fin_data["list"]:
                if row.get("account_nm") in ("매출액", "수익(매출액)"):
                    try:
                        amount = int(str(row.get("thstrm_amount", "0")).replace(",", "") or 0)
                        revenue_billion = round(amount / 1e8, 1)  # 원 → 억원
                    except ValueError:
                        pass
                    break

        result: dict = {}
        if employee_count is not None:
            result["employee_count"] = employee_count
        if revenue_billion is not None:
            result["revenue_billion"] = revenue_billion

        # 규모 분류 (DART 데이터 기반)
        if employee_count is not None or revenue_billion is not None:
            result["company_size"] = _classify_size(employee_count, revenue_billion)

        return result
    except Exception as e:
        logger.error("[researcher] DART API 조회 실패 (%s): %s", company, e, exc_info=True)
        return {}


def _classify_size(employee_count: int | None, revenue_billion: float | None) -> str:
    """직원수·매출(억원)으로 기업 규모를 분류한다."""
    emp = employee_count or 0
    rev = revenue_billion or 0

    if emp >= 1000 or rev >= 10000:
        return "대기업"
    if emp >= 300 or rev >= 1000:
        return "중견기업"
    if emp >= 10 or rev >= 10:
        return "중소기업"
    if emp >= 5 or rev >= 1:
        return "소기업"
    return "5인미만"


def _save_company(name: str, research: dict) -> dict:
    """회사 정보를 companies 테이블에 저장하고 row를 반환한다."""
    normalized = _normalize(name)
    embedding = _get_embedding(name)

    row: dict = {
        "name": name,
        "name_normalized": normalized,
        "name_embedding": embedding,
        "mission": research.get("mission"),
        "vision": research.get("vision"),
        "products_services": research.get("products_services"),
        "employee_count": research.get("employee_count"),
        "revenue_billion": research.get("revenue_billion"),
        "company_size": research.get("company_size"),
    }
    result = _supabase.table("companies").insert(row).execute()
    return result.data[0]


def _is_empty_research(row: dict) -> bool:
    """캐시된 row의 핵심 필드가 모두 null이면 True (재조사 필요)."""
    return not any(row.get(f) for f in ("mission", "vision", "products_services"))


def get_or_research_company(name: str) -> dict | None:
    """캐시 조회 후 없으면(또는 null뿐이면) 웹서치 + DART → 저장. companies row를 반환한다."""
    if not name or name in ("미확인", ""):
        return None

    cached = _find_cached(name)
    if cached and not _is_empty_research(cached):
        return cached

    if cached:
        logger.info("[researcher] '%s' 캐시가 비어있어 재조사합니다 (id=%s)", name, cached.get("id"))

    # 웹서치 결과와 DART 데이터 병합 (DART 공식 공시 데이터 우선)
    research = _research_web(name)
    dart_data = _dart_get_company_size(name)
    if dart_data:
        research.update(dart_data)

    try:
        if cached:
            # 기존 row 업데이트
            result = _supabase.table("companies").update({
                "mission": research.get("mission"),
                "vision": research.get("vision"),
                "products_services": research.get("products_services"),
                "employee_count": research.get("employee_count"),
                "revenue_billion": research.get("revenue_billion"),
                "company_size": research.get("company_size"),
            }).eq("id", cached["id"]).execute()
            return result.data[0]
        return _save_company(name, research)
    except Exception as e:
        logger.error("[researcher] companies 테이블 저장 실패 (%s): %s", name, e, exc_info=True)
        return None
