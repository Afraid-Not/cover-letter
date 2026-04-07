"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignUpPage, type SignUpFormData } from "@/components/ui/sign-up";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignUp = async (form: SignUpFormData) => {
    setError("");
    setLoading(true);
    try {
      // 1. Supabase Auth 회원가입
      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });
      if (authError) throw authError;
      if (!data.session) {
        // 이메일 인증이 필요한 경우
        throw new Error(
          "가입 확인 이메일을 발송했습니다. 이메일을 확인해주세요.",
        );
      }

      // 2. 프로필 저장 (백엔드 → 임베딩 생성 + Supabase profiles 저장)
      await api.saveProfile({
        name: form.name,
        phone: form.phone || undefined,
        job_title: form.jobTitle || undefined,
        job_seeker_status: form.jobSeekerStatus || undefined,
        years_of_experience: form.yearsOfExperience
          ? parseInt(form.yearsOfExperience)
          : undefined,
        education_level: form.educationLevel || undefined,
        education_major: form.educationMajor || undefined,
        agreed_to_terms: form.agreedToTerms,
      });

      router.push("/welcome");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SignUpPage
      heroImageSrc="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=2160&q=80"
      onSignUp={handleSignUp}
      onSignIn={() => router.push("/login")}
      loading={loading}
      error={error}
    />
  );
}
