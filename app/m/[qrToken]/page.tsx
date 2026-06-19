"use client";

import { useEffect, useState } from "react";
import { PublicMenu } from "@/components/public/PublicMenu";

type PublicMenuProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_featured: boolean;
  preparation_area: string;
  is_active: boolean;
};

type PublicMenuCategory = {
  id: string;
  name: string;
  sort_order: number | null;
  products: PublicMenuProduct[];
};

type PublicMenuTable = {
  id: string;
  name: string;
  restaurant_id: string;
  restaurants: {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
  };
};

type PublicMenuSession = {
  id: string;
  status: string;
};

type PublicMenuSettings = {
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  require_table_approval?: boolean | null;
};

type PublicMenuResponse = {
  table: PublicMenuTable;
  session: PublicMenuSession;
  settings: PublicMenuSettings;
  categories: PublicMenuCategory[];
};

type PublicMenuPageProps = {
  params: Promise<{
    qrToken: string;
  }>;
};

export default function PublicMenuPage({ params }: PublicMenuPageProps) {
  const [qrToken, setQrToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [menuData, setMenuData] = useState<PublicMenuResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadParams() {
      const resolvedParams = await params;
      setQrToken(resolvedParams.qrToken);
    }

    loadParams();
  }, [params]);

  useEffect(() => {
    if (!qrToken) {
      return;
    }

    async function loadMenu() {
      try {
        setLoading(true);
        setErrorMessage(null);

        const response = await fetch(`/api/public/menu/${qrToken}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message ?? "Erro ao carregar cardápio.");
        }

        setMenuData(data);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Erro ao carregar cardápio.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadMenu();
  }, [qrToken]);

  if (loading) {
    return (
      <main className="q-page flex min-h-screen items-center justify-center px-6 text-[var(--q-text-soft)]">
        Carregando cardápio...
      </main>
    );
  }

  if (errorMessage || !menuData) {
    return (
      <main className="q-page flex min-h-screen items-center justify-center px-6 text-[var(--q-text-soft)]">
        <div className="q-panel max-w-md p-6 text-center">
          <p className="text-lg font-semibold">Não foi possível abrir o cardápio.</p>
          <p className="mt-2 text-sm text-[var(--q-muted)]">
            {errorMessage ?? "Tente escanear o QR Code novamente."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <PublicMenu
      restaurant={menuData.table.restaurants}
      table={menuData.table}
      session={menuData.session}
      categories={menuData.categories}
      settings={menuData.settings}
    />
  );
}
