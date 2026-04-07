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
          최종 수정일: 2026년 4월 6일
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">제1조 (목적)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          본 약관은 Team NeuRack(이하 &quot;팀&quot;)이 운영하는 AURA 자소서
          생성 서비스(이하 &quot;서비스&quot;)의 이용 조건 및 절차에 관한 사항을
          규정함을 목적으로 합니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">제2조 (서비스의 내용)</h2>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>채용공고 분석 및 요구 역량 추출</li>
          <li>이력서 등록 및 구조화 파싱</li>
          <li>합격 자소서 기반 RAG 자소서 생성</li>
          <li>LLM-as-a-Judge 9인 평가 시뮬레이션</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          본 서비스는 비영리 목적으로 무료 제공되며, 별도의 요금을 부과하지
          않습니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">제3조 (이용자의 의무)</h2>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>타인의 개인정보를 도용하여 서비스를 이용해서는 안 됩니다.</li>
          <li>
            서비스를 이용하여 생성된 자소서의 최종 검토 및 활용 책임은 이용자
            본인에게 있습니다.
          </li>
          <li>서비스의 정상적인 운영을 방해하는 행위를 금지합니다.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">제4조 (외부 서비스 이용)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          본 서비스는 자소서 생성 및 평가를 위해 OpenAI API(GPT-4o)를
          활용합니다. 이용자가 입력한 채용공고, 이력서, 자소서 내용은 AI 처리를
          위해 OpenAI 서버로 전송됩니다. OpenAI의 데이터 처리 정책은 OpenAI
          이용약관을 참고하시기 바랍니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">제5조 (면책사항)</h2>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>
            AI가 생성한 자소서의 정확성, 적합성, 합격 여부에 대해 팀은 보증하지
            않습니다.
          </li>
          <li>
            서비스 이용으로 발생하는 직·간접적 손해에 대해 팀은 책임을 지지
            않습니다.
          </li>
          <li>서비스는 사전 고지 없이 변경되거나 중단될 수 있습니다.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">제6조 (약관의 변경)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          본 약관은 서비스 페이지에 게시함으로써 효력이 발생하며, 팀은 필요에
          따라 약관을 변경할 수 있습니다.
        </p>
      </section>
    </div>
  );
}
