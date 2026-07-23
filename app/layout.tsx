import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { config } from '@fortawesome/fontawesome-svg-core'
import PWAHeader from "@/components/pwa/pwa-header";

import "./globals.css";
import '@fortawesome/fontawesome-svg-core/styles.css'
config.autoAddCss = false

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NPPE Practice Exam",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <PWAHeader />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
