"""서류 통과 확률 후처리 보정 테이블 — 대학 순위, 전공 관련도, 나이/직급, 학력, 기업규모"""

from __future__ import annotations

import re
from datetime import date

# ──────────────────────────────────────────────────────────────────────────────
# 1. 대학교 티어 (한국 주요 100개 대학)
#    보정값: 기업규모 multiplier 적용 전 기준값 (%)
# ──────────────────────────────────────────────────────────────────────────────

UNIVERSITY_TIER: dict[str, int] = {
    # Tier 1 — SKY (+10)
    "서울대학교": 10, "연세대학교": 10, "고려대학교": 10,

    # Tier 2 — 서성한 + 이공계 특수대학원 (+8)
    "서강대학교": 8, "성균관대학교": 8, "한양대학교": 8,
    "한국과학기술원": 8, "KAIST": 8,
    "포항공과대학교": 8, "POSTECH": 8,

    # Tier 3 — 중경외시 + 과기원 (+5)
    "중앙대학교": 5, "경희대학교": 5,
    "한국외국어대학교": 5, "서울시립대학교": 5,
    "울산과학기술원": 5, "UNIST": 5,
    "광주과학기술원": 5, "GIST": 5,
    "대구경북과학기술원": 5, "DGIST": 5,

    # Tier 4 — 건동홍숙이 (+3)
    "건국대학교": 3, "동국대학교": 3, "홍익대학교": 3,
    "숙명여자대학교": 3, "이화여자대학교": 3,

    # Tier 5 — 주요 국공립 (+2)
    "부산대학교": 2, "경북대학교": 2, "전남대학교": 2,
    "전북대학교": 2, "충남대학교": 2, "충북대학교": 2,
    "강원대학교": 2, "경상국립대학교": 2, "제주대학교": 2,
    "인천대학교": 2, "한국해양대학교": 2,

    # Tier 6 — 기타 인서울 주요 (+1)
    "광운대학교": 1, "명지대학교": 1, "세종대학교": 1,
    "국민대학교": 1, "단국대학교": 1, "상명대학교": 1,
    "숭실대학교": 1, "가톨릭대학교": 1, "서울과학기술대학교": 1,
    "한성대학교": 1, "삼육대학교": 1, "서경대학교": 1,
    "덕성여자대학교": 1, "동덕여자대학교": 1,
    "서울여자대학교": 1, "성신여자대학교": 1,
    "서울교육대학교": 1, "경인교육대학교": 1,

    # Tier 7 — 수도권 주요 (0)
    "아주대학교": 0, "인하대학교": 0, "가천대학교": 0,
    "경기대학교": 0, "한국항공대학교": 0,
    "수원대학교": 0, "한국산업기술대학교": 0,
    "차의과학대학교": 0, "을지대학교": 0,
    "용인대학교": 0, "한국기술교육대학교": 0,
    "대진대학교": 0, "신한대학교": 0,

    # Tier 8 — 지방 주요 사립 (-2)
    "계명대학교": -2, "대구대학교": -2, "동아대학교": -2,
    "영남대학교": -2, "부경대학교": -2, "울산대학교": -2,
    "한림대학교": -2, "조선대학교": -2, "원광대학교": -2,
    "전주대학교": -2, "강릉원주대학교": -2, "목포대학교": -2,
    "순천대학교": -2, "경남대학교": -2, "창원대학교": -2,
    "안동대학교": -2, "한동대학교": -2, "동의대학교": -2,
    "대전대학교": -2, "배재대학교": -2, "호서대학교": -2,
    "청주대학교": -2, "공주대학교": -2, "군산대학교": -2,
    "목포해양대학교": -2, "한국교통대학교": -2,

    # Tier 9 — 기타 → fallback -5 (UNIVERSITY_DEFAULT_TIER 참고)
}

UNIVERSITY_DEFAULT_TIER = -5  # 목록에 없는 대학 기본값


def get_university_adjustment(school_name: str) -> int:
    """대학명으로 티어 보정값을 반환한다. 약칭·부분 일치 허용."""
    if not school_name:
        return UNIVERSITY_DEFAULT_TIER

    name = school_name.strip()
    if name in UNIVERSITY_TIER:
        return UNIVERSITY_TIER[name]

    # 부분 매핑 (KAIST, POSTECH 등 약칭 처리)
    for key, value in UNIVERSITY_TIER.items():
        if key in name or name in key:
            return value

    return UNIVERSITY_DEFAULT_TIER


# ──────────────────────────────────────────────────────────────────────────────
# 2. 기업규모 multiplier & 기본 보정값
#    - multiplier: 대학 보정값에 곱해 대기업일수록 학벌 가중치를 높임
#    - base: 기업규모 자체에 따른 통과 난이도 보정
# ──────────────────────────────────────────────────────────────────────────────

COMPANY_SIZE_MULTIPLIER: dict[str, float] = {
    "대기업": 1.5,
    "중견기업": 1.0,
    "중소기업": 0.5,
    "소기업": 0.25,
    "5인미만": 0.1,
}

COMPANY_SIZE_BASE: dict[str, float] = {
    "대기업": -3.0,   # 경쟁률 높음
    "중견기업": 0.0,
    "중소기업": 2.0,
    "소기업": 4.0,
    "5인미만": 6.0,
}


# ──────────────────────────────────────────────────────────────────────────────
# 3. 직무 카테고리 분류
# ──────────────────────────────────────────────────────────────────────────────

JOB_CATEGORIES: dict[str, list[str]] = {
    "IT/개발": ["개발", "엔지니어", "engineer", "developer", "SW", "소프트웨어",
                "백엔드", "프론트엔드", "풀스택", "devops", "sre", "데브옵스", "embedded"],
    "데이터/AI": ["데이터", "AI", "머신러닝", "딥러닝", "분석", "scientist",
                  "analyst", "mlops", "인공지능", "빅데이터"],
    "마케팅":    ["마케팅", "marketing", "광고", "홍보", "브랜드", "콘텐츠", "퍼포먼스"],
    "재무/회계": ["재무", "회계", "finance", "accounting", "세무", "감사", "투자", "IR"],
    "인사/HR":   ["인사", "HR", "채용", "HRD", "people", "조직문화", "노무"],
    "영업":      ["영업", "sales", "세일즈", "BD", "사업개발", "account"],
    "기획/전략": ["기획", "전략", "strategy", "PM", "PO", "product", "경영기획"],
    "디자인":    ["디자인", "design", "UX", "UI", "그래픽", "브랜딩", "BX", "BI"],
    "연구개발":  ["연구", "R&D", "RD", "설계", "기계", "전기", "화학", "소재", "바이오공학"],
    "법무":      ["법무", "legal", "준법", "컴플라이언스", "변호사", "특허"],
    "의료/바이오": ["의료", "바이오", "제약", "임상", "의학", "간호", "약학"],
    "건설/건축": ["건설", "건축", "토목", "시공", "플랜트", "인프라"],
    "제조/생산": ["제조", "생산", "품질", "공장", "QC", "QA", "SCM", "물류"],
}


def classify_job_category(position: str) -> str:
    """직무명으로 카테고리를 분류한다."""
    if not position:
        return "기타"
    pos_lower = position.lower()
    for category, keywords in JOB_CATEGORIES.items():
        if any(kw.lower() in pos_lower for kw in keywords):
            return category
    return "기타"


# ──────────────────────────────────────────────────────────────────────────────
# 4. 전공 관련도 테이블 (직무 카테고리 → 전공 키워드 → 보정값 -5~+5)
# ──────────────────────────────────────────────────────────────────────────────

MAJOR_RELEVANCE: dict[str, dict[str, int]] = {
    "IT/개발": {
        "컴퓨터공학": 5, "소프트웨어공학": 5, "컴퓨터과학": 5, "전산학": 5,
        "정보통신공학": 4, "전기전자공학": 4, "전자공학": 4,
        "정보공학": 4, "정보보안": 4, "네트워크공학": 3,
        "수학": 2, "통계학": 2, "물리학": 2,
        "경영정보": 1, "산업공학": 1,
    },
    "데이터/AI": {
        "통계학": 5, "수학": 5, "컴퓨터공학": 5, "인공지능": 5,
        "데이터사이언스": 5, "빅데이터": 5,
        "산업공학": 4, "전기전자공학": 4, "물리학": 4,
        "경제학": 3, "경영학": 2, "사회학": 2,
    },
    "마케팅": {
        "경영학": 5, "마케팅": 5, "광고홍보학": 5,
        "심리학": 4, "사회학": 4, "커뮤니케이션": 4,
        "언론정보": 4, "미디어": 3, "소비자학": 3,
        "통계학": 2, "데이터사이언스": 2,
    },
    "재무/회계": {
        "경영학": 5, "회계학": 5, "경제학": 5,
        "금융학": 5, "재무학": 5,
        "통계학": 3, "수학": 3, "법학": 3,
        "무역학": 2,
    },
    "인사/HR": {
        "경영학": 5, "심리학": 5, "사회학": 4,
        "교육학": 4, "산업심리학": 4,
        "행정학": 3, "사회복지학": 2,
    },
    "영업": {
        "경영학": 4, "마케팅": 4, "무역학": 3,
        "외국어": 3, "경제학": 3, "심리학": 2,
    },
    "기획/전략": {
        "경영학": 5, "경제학": 4, "행정학": 3,
        "산업공학": 3, "통계학": 3,
    },
    "디자인": {
        "시각디자인": 5, "산업디자인": 5, "UX디자인": 5,
        "UI디자인": 5, "그래픽디자인": 5, "디자인": 5,
        "영상디자인": 4, "애니메이션": 4, "미술": 3,
        "컴퓨터공학": 2,
    },
    "연구개발": {
        "기계공학": 5, "전기공학": 5, "화학공학": 5,
        "재료공학": 5, "전자공학": 5, "물리학": 5,
        "화학": 5, "생명과학": 5, "바이오공학": 5,
        "컴퓨터공학": 4, "수학": 4, "환경공학": 4,
    },
    "법무": {
        "법학": 5,
        "경영학": 2, "행정학": 2,
    },
    "의료/바이오": {
        "의학": 5, "약학": 5, "간호학": 5,
        "생명과학": 5, "생명공학": 5,
        "화학": 4, "생물학": 4, "의료공학": 4,
    },
    "건설/건축": {
        "건축공학": 5, "토목공학": 5, "건설공학": 5,
        "도시공학": 4, "환경공학": 4,
        "기계공학": 3, "전기공학": 3,
    },
    "제조/생산": {
        "기계공학": 5, "산업공학": 5, "화학공학": 5,
        "재료공학": 5, "전기공학": 4,
        "물리학": 3, "환경공학": 3, "컴퓨터공학": 2,
    },
    "기타": {},
}


def get_major_adjustment(major: str, job_category: str) -> int:
    """전공과 직무 카테고리로 전공 관련도 보정값을 반환한다."""
    if not major:
        return 0
    table = MAJOR_RELEVANCE.get(job_category, {})
    if not table:
        return 0

    major_lower = major.lower()
    for key, value in table.items():
        if key.lower() in major_lower or major_lower in key.lower():
            return value

    return -2  # 관련 없는 전공 소폭 감산


# ──────────────────────────────────────────────────────────────────────────────
# 5. 나이/직급 보정
#    (min_ideal, max_ideal, abs_min, abs_max)
#    적정 범위: +5%, 범위 밖 점진적 감산, 절대 범위 밖: -5%
# ──────────────────────────────────────────────────────────────────────────────

RANK_KEYWORDS: dict[str, list[str]] = {
    "인턴":  ["인턴", "intern", "실습"],
    "사원":  ["사원", "신입", "주니어", "junior", "associate", "jr."],
    "주임":  ["주임", "선임"],
    "대리":  ["대리", "매니저", "manager", "specialist"],
    "과장":  ["과장", "시니어 매니저", "senior manager", "수석"],
    "차장":  ["차장", "리드", "lead", "principal", "책임", "팀장"],
    "부장":  ["부장", "부서장", "그룹장", "실장", "파트장"],
    "임원":  ["임원", "이사", "director", "VP", "CTO", "CEO", "CFO", "COO",
              "상무", "전무", "C레벨"],
}

RANK_AGE_RANGE: dict[str, tuple[int, int, int, int]] = {
    "인턴": (20, 27, 18, 32),
    "사원": (22, 28, 20, 33),
    "주임": (25, 31, 22, 36),
    "대리": (28, 34, 25, 39),
    "과장": (32, 38, 28, 43),
    "차장": (36, 42, 32, 47),
    "부장": (40, 50, 36, 55),
    "임원": (45, 60, 38, 65),
}


def classify_rank(position: str) -> str:
    """직무/직급명으로 직급을 분류한다."""
    if not position:
        return ""
    pos_lower = position.lower()
    for rank, keywords in RANK_KEYWORDS.items():
        if any(kw.lower() in pos_lower for kw in keywords):
            return rank
    return ""


def get_age_adjustment(age: int | None, rank: str) -> float:
    """나이와 직급으로 나이 보정값을 반환한다 (-5 ~ +5)."""
    if not age or not rank or rank not in RANK_AGE_RANGE:
        return 0.0

    min_ideal, max_ideal, abs_min, abs_max = RANK_AGE_RANGE[rank]

    if age < abs_min or age > abs_max:
        return -5.0

    if min_ideal <= age <= max_ideal:
        return 5.0

    if age < min_ideal:
        gap = min_ideal - abs_min
        distance = min_ideal - age
        return max(-5.0, 5.0 - (distance * 10.0 / gap)) if gap else -5.0
    else:
        gap = abs_max - max_ideal
        distance = age - max_ideal
        return max(-5.0, 5.0 - (distance * 10.0 / gap)) if gap else -5.0


# ──────────────────────────────────────────────────────────────────────────────
# 6. 최종 학력 보정
# ──────────────────────────────────────────────────────────────────────────────

EDUCATION_ADJUSTMENT: dict[str, dict[str, float]] = {
    "박사": {
        "IT/개발": 3.0, "데이터/AI": 5.0, "연구개발": 5.0,
        "의료/바이오": 4.0, "법무": 3.0,
        "default": 2.0,
    },
    "석사": {
        "IT/개발": 2.0, "데이터/AI": 4.0, "연구개발": 4.0,
        "의료/바이오": 3.0, "재무/회계": 2.0,
        "default": 1.5,
    },
    "학사": {"default": 0.0},
    "고졸": {
        "제조/생산": 0.0, "영업": -1.0,
        "기타": -2.0, "default": -3.0,
    },
}


def get_education_adjustment(degree: str, job_category: str) -> float:
    """최종 학력과 직무 카테고리로 학력 보정값을 반환한다."""
    if not degree:
        return 0.0

    if "박사" in degree or "ph.d" in degree.lower():
        tier = "박사"
    elif "석사" in degree or "master" in degree.lower():
        tier = "석사"
    elif "고졸" in degree or "고등학교" in degree:
        tier = "고졸"
    else:
        tier = "학사"

    table = EDUCATION_ADJUSTMENT.get(tier, {})
    return table.get(job_category, table.get("default", 0.0))


# ──────────────────────────────────────────────────────────────────────────────
# 7. 이력서에서 학교·전공·학력·나이 추론
# ──────────────────────────────────────────────────────────────────────────────

def _infer_degree(edu: dict) -> str:
    """education 항목 하나에서 학위를 추론한다."""
    school = edu.get("school", "")
    period = edu.get("period", "")
    major = edu.get("major", "")
    combined = f"{school} {period} {major}".lower()

    if "박사" in combined or "ph.d" in combined:
        return "박사"
    if "석사" in combined or "대학원" in combined or "master" in combined:
        return "석사"
    if "고등학교" in combined or "고졸" in combined:
        return "고졸"
    if school:
        return "학사"
    return ""


def _infer_age(resume: dict) -> int | None:
    """학력/경력 기간에서 나이를 추정한다 (졸업 연도 기준 22세 대입 가정)."""
    current_year = date.today().year

    for edu in resume.get("education", []):
        period = edu.get("period", "")
        years = re.findall(r"(19|20)\d{2}", period)
        if years:
            grad_year = max(int(y) for y in years)
            age = current_year - grad_year + 22
            if 18 <= age <= 70:
                return age

    return None


# ──────────────────────────────────────────────────────────────────────────────
# 8. 종합 보정 계산 (외부에서 호출)
# ──────────────────────────────────────────────────────────────────────────────

def compute_score_adjustment(
    resume_structured: dict,
    company_size: str | None,
    job_analysis: dict,
) -> dict:
    """이력서 + 기업규모 + 직무분석으로 통과 확률 후처리 보정값을 계산한다.

    Returns:
        {
            "total": float,          # 최종 보정값 (%-point, -20~+20에 clamp)
            "university": float,
            "company_size_base": float,
            "major": int,
            "education": float,
            "age": float,
            "meta": {                # 디버그/UI 표시용
                "school", "major_name", "degree", "age_value",
                "job_category", "rank"
            }
        }
    """
    position = job_analysis.get("position", "")
    job_category = classify_job_category(position)
    rank = classify_rank(position)

    # 최신(첫 번째) 학력 항목에서 추출
    edu_list = resume_structured.get("education", [])
    top_edu = edu_list[0] if edu_list else {}
    school = top_edu.get("school", "")
    major = top_edu.get("major", "")
    degree = _infer_degree(top_edu)
    age = _infer_age(resume_structured)

    # 개별 보정값
    univ_base = get_university_adjustment(school)
    size_mult = COMPANY_SIZE_MULTIPLIER.get(company_size, 1.0) if company_size else 1.0
    size_base = COMPANY_SIZE_BASE.get(company_size, 0.0) if company_size else 0.0

    university_adj = round(univ_base * size_mult, 1)
    major_adj = get_major_adjustment(major, job_category)
    edu_adj = get_education_adjustment(degree, job_category)
    age_adj = get_age_adjustment(age, rank)

    total = university_adj + size_base + major_adj + edu_adj + age_adj
    total = max(-20.0, min(20.0, round(total, 1)))

    return {
        "total": total,
        "university": university_adj,
        "company_size_base": size_base,
        "major": major_adj,
        "education": edu_adj,
        "age": age_adj,
        "meta": {
            "school": school,
            "major_name": major,
            "degree": degree,
            "age_value": age,
            "job_category": job_category,
            "rank": rank,
            "company_size": company_size,
        },
    }
