import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { NextAuthProvider } from "@/components/providers/NextAuthProvider";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bachat | Account Finance Management",
  description: "Advanced role-based finance management system for mutual funds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className={`${inter.variable} ${outfit.variable} antialiased font-sans bg-slate-950 text-slate-100 min-h-full flex flex-col`}>
        <NextAuthProvider>
          {children}
          <Toaster position="top-right" />
        </NextAuthProvider>
      </body>
    </html>
  );
}
