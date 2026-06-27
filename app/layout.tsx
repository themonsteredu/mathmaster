import type { Metadata } from "next";
import "./globals.css";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title: "오답Master",
  description: "틀린 문제를 반복해서 풀고 관리하는 수학학원 오답 학습 앱",
  icons: { icon: "https://www.themonster.kr/img/monster-symbol.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
