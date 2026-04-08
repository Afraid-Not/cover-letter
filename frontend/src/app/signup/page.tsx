"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SignUpPage, type SignUpFormData } from "@/components/ui/sign-up";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

const SignupContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOAuth = searchParams.get("oauth") === "google";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [oauthEmail, setOauthEmail] = useState("");
  const [oauthName, setOauthName] = useState("");

  useEffect(() => {
    if (!isOAuth) return;
    const loadOAuthUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      setOauthEmail(session.user.email ?? "");
      setOauthName(
        session.user.user_metadata?.full_name ??
          session.user.user_metadata?.name ??
          "",
      );
    };
    loadOAuthUser();
  }, [isOAuth, router]);

  const handleSignUp = async (form: SignUpFormData) => {
    setError("");
    setLoading(true);
    try {
      if (!isOAuth) {
        const { data, error: authError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
        });
        if (authError) throw authError;
        if (!data.session) {
          throw new Error(
            "가입 확인 이메일을 발송했습니다. 이메일을 확인해주세요.",
          );
        }
      }

      const yearsMap: Record<string, number> = {
        "경력 1년": 1,
        "경력 2년": 2,
        "경력 3년 이상": 3,
      };

      await api.saveProfile({
        name: form.name,
        phone: form.phone || undefined,
        birth_date: form.birthDate || undefined,
        job_title: form.jobTitle || undefined,
        job_seeker_status: form.jobSeekerStatus || undefined,
        years_of_experience: yearsMap[form.jobSeekerStatus],
        education_level: form.educationLevel || undefined,
        education_major: form.educationMajor || undefined,
        agreed_to_terms: form.agreedToTerms,
      });

      router.push("/pricing?onboarding=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SignUpPage
      onSignUp={handleSignUp}
      onSignIn={() => router.push("/login")}
      loading={loading}
      error={error}
      isOAuth={isOAuth}
      oauthEmail={oauthEmail}
      oauthName={oauthName}
    />
  );
};

export default function SignupPage() {
  return (
    <Suspense>
      <SignupContent />
    </Suspense>
  );
}
