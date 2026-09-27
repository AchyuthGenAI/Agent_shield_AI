import type { Metadata } from "next";
import "./globals.css";
import "./home.css";
import "./studio/studio.css";

export const metadata: Metadata = {
  title: "PromptGuard Studio — Prompt Injection Firewall",
  description: "See the trust boundary between external content and an AI workflow. Inspect prompt injections, review decisions, and try the working PromptGuard Studio.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
