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
          최종 수정일: 2026년 4월 6일
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
            <strong>회원가입 시:</strong> 이메일 주소
          </li>
          <li>
            <strong>이력서 등록 시:</strong> 이름, 이력서 내용 (학력, 경력,
            프로젝트, 기술 스택 등 이용자가 직접 입력한 정보)
          </li>
          <li>
            <strong>자소서 생성 시:</strong> 채용공고 텍스트, 생성된 자소서,
            평가 결과
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">2. 수집 및 이용 목적</h2>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>회원 식별 및 로그인 기능 제공</li>
          <li>이력서 기반 맞춤형 자소서 생성</li>
          <li>자소서 생성 이력 관리</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">3. 제3자 제공 및 외부 전송</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          본 서비스는 AI 기반 자소서 생성 및 평가를 위해{" "}
          <strong>OpenAI API(GPT-4o)</strong>를 활용합니다. 아래 데이터가 처리
          과정에서 OpenAI 서버로 전송됩니다.
        </p>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>이력서 텍스트 (구조화 파싱 목적)</li>
          <li>채용공고 텍스트 (분석 및 자소서 생성 목적)</li>
          <li>생성된 자소서 (평가 시뮬레이션 목적)</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          OpenAI API 사용 시 데이터는 모델 학습에 사용되지 않습니다 (OpenAI API
          Data Usage Policy 기준). 그 외 제3자에게 개인정보를 제공하지 않습니다.
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
            이용자는 서비스 내에서 이력서 및 프로젝트 데이터를 직접 삭제할 수
            있습니다.
          </li>
          <li>
            계정 삭제를 원하는 경우 팀에 요청하면 관련 데이터를 지체 없이
            파기합니다.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">5. 이용자의 권리</h2>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>
            등록한 이력서 및 생성 이력의 열람, 수정, 삭제를 요청할 수 있습니다.
          </li>
          <li>서비스 이용을 중단하고 데이터 삭제를 요청할 수 있습니다.</li>
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
