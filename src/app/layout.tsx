import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TITLE = "hi here — 지금 내 주변에서 뭐 하지?";
const DESCRIPTION =
  "팝업부터 전시, 축제, 공연까지. 내 주변에서 열리는 다양한 이벤트를 한눈에 발견하고, 오늘의 새로운 경험을 찾아보세요.";

export const metadata: Metadata = {
  metadataBase: new URL("https://blog-v2-eta-neon.vercel.app"),
  title: { default: TITLE, template: "%s | hi here" },
  description: DESCRIPTION,
  applicationName: "hi here",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "hi here",
    locale: "ko_KR",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
