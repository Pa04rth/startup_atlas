import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { PageViewTracker } from "@/components/PageViewTracker";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Startup Atlas",
  description:
    "A city-by-city map of startups — locations, jobs, walk-in interviews, news, and the people who work there.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white font-sans text-neutral-900 antialiased">
        <PageViewTracker />
        {children}
      </body>
    </html>
  );
}
