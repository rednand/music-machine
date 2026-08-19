import type { Metadata } from "next";
import { IBM_Plex_Mono, Playfair_Display, Syne, Work_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const playfairDisplay = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const syne = Syne({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["800"],
  fallback: ["sans-serif"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const workSans = Work_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Music Time Machine",
  description: "Descubra a história por trás dos álbuns que marcaram época.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${playfairDisplay.variable} ${syne.variable} ${ibmPlexMono.variable} ${workSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f7f4f1] font-sans text-[#171420]">
        <AppShell>{children}</AppShell>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
