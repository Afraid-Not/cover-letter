"use client";

import { useRouter } from "next/navigation";

export default function PrivacyPage() {
  const router = useRouter();
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
      <div>
        <button
          onClick={() =>
            window.history.length > 1 ? router.back() : window.close()
          }
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; 돌아가기
        </button>
        <h1 className="text-2xl font-bold mt-4">개인정보처리방침</h1>
        <p className="text-sm text-muted-foreground mt-1">
          최종 수정일: 2026년 4월 8일
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">1. 수집하는 개인정보 항목</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Team NeuRack(이하 &quot;팀&quot;)은 서비스 제공을 위해 다음 정보를
          수집합니다.
        </p>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>
            <strong>회원가입 시:</strong> 이메일 주소 (Google OAuth 로그인의
            경우 Google 계정 이메일 및 프로필 정보)
          </li>
          <li>
            <strong>프로필 설정 시:</strong> 이름, 희망 직무, 구직
            상태(신입/경력), 경력 연수, 최종 학력, 전공, 자기소개(최대 200자),
            프로필 사진
          </li>
          <li>
            <strong>이력서 등록 시:</strong> 이력서 내용 (학력, 경력, 프로젝트,
            기술 스택 등 이용자가 직접 입력한 정보)
          </li>
          <li>
            <strong>자소서 생성 시:</strong> 채용공고 텍스트, 생성된 자소서,
            평가 결과, 회사 조사 결과
          </li>
          <li>
            <strong>결제 시:</strong> 결제 수단 정보(빌링키), 구독 상태, 결제
            금액, 결제일 (카드번호 등 민감 결제 정보는 Toss Payments에서 직접
            처리하며, 팀은 보관하지 않습니다)
          </li>
          <li>
            <strong>쿠폰 사용 시:</strong> 쿠폰 코드, 사용 일시
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">2. 수집 및 이용 목적</h2>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>회원 식별 및 로그인 기능 제공</li>
          <li>이력서 기반 맞춤형 자소서 생성 및 재생성</li>
          <li>LLM-as-a-Judge 9인 평가 시뮬레이션 제공</li>
          <li>회사 자동 조사 (웹 검색 및 공시 정보 수집)</li>
          <li>서류 통과 확률 보정 분석 (학력, 전공, 경력 기반)</li>
          <li>자소서 생성 이력 관리 및 사용량 추적</li>
          <li>유료 요금제 구독 결제 처리</li>
          <li>쿠폰 적립 및 추가 크레딧 관리</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">3. 제3자 제공 및 외부 전송</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          본 서비스는 기능 제공을 위해 다음 외부 서비스를 활용하며, 이용자의
          데이터가 처리 과정에서 해당 서버로 전송될 수 있습니다.
        </p>

        <h3 className="text-sm font-semibold mt-4">OpenAI API (GPT-4o)</h3>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>
            전송 데이터: 이력서 텍스트, 채용공고 텍스트, 생성된 자소서, 회사명
          </li>
          <li>목적: 이력서 파싱, 채용공고 분석, 자소서 생성·평가, 회사 조사</li>
          <li>
            OpenAI API 사용 시 데이터는 모델 학습에 사용되지 않습니다 (OpenAI
            API Data Usage Policy 기준)
          </li>
        </ul>

        <h3 className="text-sm font-semibold mt-4">Tavily API</h3>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>전송 데이터: 회사명, 검색 키워드</li>
          <li>목적: 회사 정보 웹 검색 (미션, 비전, 제품·서비스 등)</li>
        </ul>

        <h3 className="text-sm font-semibold mt-4">
          DART API (금융감독원 전자공시)
        </h3>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>전송 데이터: 회사명</li>
          <li>목적: 기업 공시 정보 조회 (직원수, 매출 등)</li>
        </ul>

        <h3 className="text-sm font-semibold mt-4">Toss Payments</h3>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>전송 데이터: 결제 인증 정보 (authKey, customerKey)</li>
          <li>목적: 유료 요금제 빌링키 발급 및 정기 결제 처리</li>
          <li>
            카드번호 등 민감 결제 정보는 Toss Payments에서 직접 처리하며, 팀의
            서버에는 저장되지 않습니다
          </li>
        </ul>

        <h3 className="text-sm font-semibold mt-4">Google OAuth</h3>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>전송 데이터: 인증 토큰</li>
          <li>목적: 소셜 로그인 (이메일 및 프로필 정보 수신)</li>
        </ul>

        <h3 className="text-sm font-semibold mt-4">Supabase</h3>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>전송 데이터: 서비스 이용에 따른 모든 데이터</li>
          <li>
            목적: 데이터베이스 저장, 사용자 인증, 파일 저장소 (프로필 사진)
          </li>
          <li>
            데이터는 이용자 계정 단위로 격리(Row Level Security)되어 관리됩니다
          </li>
        </ul>

        <p className="text-sm text-muted-foreground leading-relaxed mt-4">
          상기 외부 서비스 외 제3자에게 개인정보를 제공하지 않습니다. 각 외부
          서비스의 상세 데이터 처리 정책은 해당 서비스의 개인정보처리방침을
          참고하시기 바랍니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">4. 보관 및 파기</h2>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>
            데이터는 Supabase 클라우드 데이터베이스에 저장되며, 이용자 계정
            단위로 격리(RLS)됩니다.
          </li>
          <li>
            프로필 사진은 Supabase Storage에 저장되며, 이용자 본인만 업로드 및
            수정할 수 있습니다.
          </li>
          <li>
            이용자는 서비스 내에서 이력서 및 프로젝트 데이터를 직접 삭제할 수
            있습니다. 프로젝트 삭제 시 데이터는 소프트 삭제 처리되며, 월별
            사용량 집계 후 완전 파기됩니다.
          </li>
          <li>
            이용자는 마이페이지에서 직접 회원 탈퇴할 수 있으며, 탈퇴 시 계정 및
            관련 데이터가 즉시 삭제됩니다.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">5. 이용자의 권리</h2>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>
            등록한 이력서 및 생성 이력의 열람, 수정, 삭제를 서비스 내에서 직접
            수행할 수 있습니다.
          </li>
          <li>
            프로필 정보(이름, 희망 직무, 자기소개, 프로필 사진 등)를 언제든지
            수정할 수 있습니다.
          </li>
          <li>
            마이페이지에서 회원 탈퇴를 통해 서비스 이용을 중단하고 모든 데이터를
            삭제할 수 있습니다.
          </li>
          <li>구독 중인 유료 요금제를 언제든지 해지할 수 있습니다.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">6. 방침의 변경</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          본 개인정보처리방침은 서비스 페이지에 게시함으로써 효력이 발생하며,
          변경 사항이 있을 경우 서비스 내 공지를 통해 안내합니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">7. 문의</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          개인정보 관련 문의는 Team NeuRack에 연락 바랍니다.
        </p>
      </section>
    </div>
  );
}
