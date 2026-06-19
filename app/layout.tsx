import type { Metadata } from "next";
import "./globals.css";

const title = "Quitéria | Sistema para bares e restaurantes com pedidos por QR Code";
const description =
  "Sistema para bares, restaurantes, lanchonetes e adegas com cardápio digital por QR Code, controle de mesas, pedidos em tempo real, cozinha, bar, caixa e gestão do atendimento.";

export const metadata: Metadata = {
  title: {
    default: title,
    template: "%s | Quitéria",
  },
  description,
  keywords: [
    "sistema para restaurante",
    "sistema para bar",
    "cardápio digital com QR Code",
    "comanda digital",
    "pedidos por QR Code",
    "controle de mesas",
    "sistema para garçom",
    "sistema para cozinha",
    "sistema para caixa de restaurante",
    "gestão de pedidos para restaurantes",
    "software para bares e restaurantes",
  ],
  openGraph: {
    title,
    description,
    type: "website",
    locale: "pt_BR",
    siteName: "Quitéria",
  },
  robots: {
    index: true,
    follow: true,
  },
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
