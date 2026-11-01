import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist } from "next/font/google";
import type { ReactNode } from "react";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { ToastProvider } from "@/components/Toaster";
import { fontFaceCss } from "@/lib/resume/fonts";
import "./globals.css";

// Self-hosted at build time by next/font (no runtime requests to Google).
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", axes: ["opsz"] });

export const metadata: Metadata = {
  title: { default: "Resume Builder", template: "%s | Resume Builder" },
  description: "Build ATS-friendly resumes with AI writing help, professional templates, PDF import and job-description matching.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${bricolage.variable}`}>
      <body className="min-h-screen">
        {/* Resume template fonts for previews; browsers only download the families a page uses. */}
        <style dangerouslySetInnerHTML={{ __html: fontFaceCss() }} />
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
