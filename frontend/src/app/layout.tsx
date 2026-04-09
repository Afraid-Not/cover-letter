import type { Metadata } from "next";
import {
  DM_Sans,
  Instrument_Serif,
  Nanum_Myeongjo,
  Playfair_Display,
} from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const nanumMyeongjo = Nanum_Myeongjo({
  variable: "--font-loader",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://hapgyeok.com",
  ),
  title: "합격 | AI로 작성하는 나만의 이야기",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    images: ["/og.png"],
  },
  description: "합격 자소서 기반 RAG 자소서 생성 + LLM-as-a-Judge 평가",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${dmSans.variable} ${instrumentSerif.variable} ${nanumMyeongjo.variable} ${playfairDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
        <Analytics />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
