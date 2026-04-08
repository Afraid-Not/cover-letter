"use client";

import { useRouter } from "next/navigation";

export default function TermsPage() {
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
        <h1 className="text-2xl font-bold mt-4">이용약관</h1>
        <p className="text-sm text-muted-foreground mt-1">
          최종 수정일: 2026년 4월 8일
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">제1조 (목적)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          본 약관은 Team NeuRack(이하 &quot;팀&quot;)이 운영하는 합격 자소서
          생성 서비스(이하 &quot;서비스&quot;)의 이용 조건 및 절차에 관한 사항을
          규정함을 목적으로 합니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">제2조 (서비스의 내용)</h2>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>채용공고 분석 및 요구 역량·키워드 추출</li>
          <li>이력서 등록 및 구조화 파싱</li>
          <li>합격 자소서 기반 RAG 자소서 생성 및 피드백 재생성</li>
          <li>LLM-as-a-Judge 9인 평가 시뮬레이션</li>
          <li>
            회사 자동 조사 (웹 검색 및 공시 정보 기반 미션·비전·제품서비스 수집)
          </li>
          <li>서류 통과 확률 보정 분석</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">제3조 (회원가입 및 계정)</h2>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>회원가입은 이메일 인증 또는 Google OAuth를 통해 이루어집니다.</li>
          <li>
            이용자는 마이페이지에서 직접 회원 탈퇴할 수 있으며, 탈퇴 시 계정 및
            관련 데이터가 삭제됩니다.
          </li>
          <li>
            하나의 계정을 복수의 사람이 공유하거나, 타인의 계정을 도용하여
            서비스를 이용해서는 안 됩니다.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">제4조 (요금제 및 결제)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          서비스는 무료(Free), Pro, Enterprise 요금제를 제공하며, 각 요금제에
          따라 이력서 등록 수, 자소서 생성·재생성 횟수, 회사 자동 검색 횟수 등의
          이용 한도가 달라집니다.
        </p>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>
            <strong>Free:</strong> 이력서 1개, 월 생성 5회, 재생성 0회, 회사
            검색 크레딧 기반
          </li>
          <li>
            <strong>Pro (월 9,900원):</strong> 이력서 10개, 월 생성 무제한,
            재생성 5회, 회사 검색 무제한
          </li>
          <li>
            <strong>Enterprise (월 99,000원):</strong> 모든 기능 무제한
          </li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          유료 요금제는 Toss Payments를 통한 빌링키 방식의 월 정기 구독 결제로
          운영됩니다. 최초 결제 시 빌링키가 발급되며 즉시 첫 결제가 진행됩니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">제5조 (구독 해지 및 환불)</h2>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>
            이용자는 마이페이지 또는 서비스 내에서 언제든지 구독을 해지할 수
            있습니다.
          </li>
          <li>
            구독 해지 시 다음 결제일부터 요금이 청구되지 않으며, 현재 결제
            주기가 끝날 때까지 유료 기능을 계속 이용할 수 있습니다.
          </li>
          <li>
            이미 결제된 금액에 대한 환불은 원칙적으로 제공되지 않습니다. 단,
            서비스 장애 등 팀의 귀책 사유가 있는 경우 개별 협의를 통해 환불이
            가능합니다.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">제6조 (쿠폰)</h2>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>
            팀이 발급한 쿠폰을 등록하면 추가 생성 횟수, 재생성 횟수, 회사 검색
            크레딧이 적립됩니다.
          </li>
          <li>
            쿠폰은 1인 1회 사용 가능하며, 유효기간이 만료되면 사용할 수
            없습니다.
          </li>
          <li>Enterprise 요금제 이용자는 쿠폰을 사용할 수 없습니다.</li>
          <li>쿠폰은 타인에게 양도하거나 현금으로 환급받을 수 없습니다.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">제7조 (이용자의 의무)</h2>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>타인의 개인정보를 도용하여 서비스를 이용해서는 안 됩니다.</li>
          <li>
            서비스를 이용하여 생성된 자소서의 최종 검토 및 활용 책임은 이용자
            본인에게 있습니다.
          </li>
          <li>서비스의 정상적인 운영을 방해하는 행위를 금지합니다.</li>
          <li>
            부정한 방법으로 쿠폰을 취득하거나 이용 한도를 우회하는 행위를
            금지합니다.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">제8조 (외부 서비스 이용)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          본 서비스는 기능 제공을 위해 다음 외부 서비스를 활용하며, 이용자가
          입력한 데이터가 해당 서버로 전송될 수 있습니다.
        </p>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>
            <strong>OpenAI API (GPT-4o):</strong> 이력서 파싱, 채용공고 분석,
            자소서 생성 및 평가, 회사 조사
          </li>
          <li>
            <strong>Tavily API:</strong> 회사 정보 웹 검색
          </li>
          <li>
            <strong>DART API (전자공시):</strong> 기업 공시 정보 조회
          </li>
          <li>
            <strong>Toss Payments:</strong> 유료 요금제 구독 결제 처리
          </li>
          <li>
            <strong>Google OAuth:</strong> 소셜 로그인 인증
          </li>
          <li>
            <strong>Supabase:</strong> 데이터베이스, 인증, 파일 저장소
          </li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          각 외부 서비스의 데이터 처리 정책은 해당 서비스의 이용약관 및
          개인정보처리방침을 참고하시기 바랍니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">제9조 (면책사항)</h2>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>
            AI가 생성한 자소서의 정확성, 적합성, 합격 여부에 대해 팀은 보증하지
            않습니다.
          </li>
          <li>
            회사 자동 조사 결과의 정확성 및 최신성에 대해 팀은 보증하지
            않습니다.
          </li>
          <li>
            서비스 이용으로 발생하는 직·간접적 손해에 대해 팀은 책임을 지지
            않습니다.
          </li>
          <li>
            외부 서비스(OpenAI, Tavily, DART, Toss Payments 등)의 장애나 정책
            변경으로 인한 서비스 중단에 대해 팀은 책임을 지지 않습니다.
          </li>
          <li>서비스는 사전 고지 없이 변경되거나 중단될 수 있습니다.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">제10조 (약관의 변경)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          본 약관은 서비스 페이지에 게시함으로써 효력이 발생하며, 팀은 필요에
          따라 약관을 변경할 수 있습니다. 변경된 약관은 서비스 내 공지를 통해
          안내합니다.
        </p>
      </section>
    </div>
  );
}
