import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIOTIE Research | Research Intelligence",
  description: "AIOTIE Research is an evidence-first healthcare research intelligence workspace.",
  other: {
    "codex-preview": "development",
  },
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
