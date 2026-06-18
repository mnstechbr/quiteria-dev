import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quitéria | MNS Tech",
  description: "Sistema SaaS mobile-first para bares e restaurantes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
