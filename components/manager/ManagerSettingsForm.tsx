"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ManagerSettingsResponse } from "@/types/restaurant-settings";

type ManagerSettingsFormProps = {
  initialData: ManagerSettingsResponse;
  accessToken: string;
};

export function ManagerSettingsForm({
  initialData,
  accessToken,
}: ManagerSettingsFormProps) {
  const [name, setName] = useState(initialData.restaurant.name);
  const [slug, setSlug] = useState(initialData.restaurant.slug);
  const [logoUrl, setLogoUrl] = useState(initialData.settings?.logo_url ?? "");
  const [bannerUrl, setBannerUrl] = useState(
    initialData.settings?.banner_url ?? "",
  );
  const [primaryColor, setPrimaryColor] = useState(
    initialData.settings?.primary_color ?? "#f97316",
  );
  const [secondaryColor, setSecondaryColor] = useState(
    initialData.settings?.secondary_color ?? "#111827",
  );
  const [defaultServicePercent, setDefaultServicePercent] = useState(
    String(initialData.settings?.default_service_percent ?? 10),
  );
  const [
    allowCashierServicePercentEdit,
    setAllowCashierServicePercentEdit,
  ] = useState(
    initialData.settings?.allow_cashier_service_percent_edit ?? true,
  );
  const [requireTableApproval, setRequireTableApproval] = useState(
    initialData.settings?.require_table_approval ?? true,
  );
  const [requireOrderApproval, setRequireOrderApproval] = useState(
    initialData.settings?.require_order_approval ?? true,
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(initialData.restaurant.name);
    setSlug(initialData.restaurant.slug);
    setLogoUrl(initialData.settings?.logo_url ?? "");
    setBannerUrl(initialData.settings?.banner_url ?? "");
    setPrimaryColor(initialData.settings?.primary_color ?? "#f97316");
    setSecondaryColor(initialData.settings?.secondary_color ?? "#111827");
    setDefaultServicePercent(
      String(initialData.settings?.default_service_percent ?? 10),
    );
    setAllowCashierServicePercentEdit(
      initialData.settings?.allow_cashier_service_percent_edit ?? true,
    );
    setRequireTableApproval(
      initialData.settings?.require_table_approval ?? true,
    );
    setRequireOrderApproval(
      initialData.settings?.require_order_approval ?? true,
    );
  }, [initialData]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch("/api/manager/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name,
          slug,
          logo_url: logoUrl,
          banner_url: bannerUrl,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          default_service_percent: Number(defaultServicePercent),
          allow_cashier_service_percent_edit: allowCashierServicePercentEdit,
          require_table_approval: requireTableApproval,
          require_order_approval: requireOrderApproval,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao salvar configurações.");
      }

      setMessage("Configurações salvas com sucesso.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao salvar configurações.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-black">Restaurante</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Informações principais exibidas no sistema e no cardápio.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-zinc-300">
              Nome do restaurante
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-zinc-300">Slug</span>
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-zinc-300">
              URL do logo
            </span>
            <input
              value={logoUrl}
              onChange={(event) => setLogoUrl(event.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-zinc-300">
              URL do banner
            </span>
            <input
              value={bannerUrl}
              onChange={(event) => setBannerUrl(event.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
            />
          </label>
        </div>
      </Card>

      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-black">Aparência</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Cores usadas para personalizar a experiência do restaurante.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-zinc-300">
              Cor principal
            </span>
            <div className="flex gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
                className="h-12 w-16 rounded-xl border border-white/10 bg-zinc-900"
              />
              <input
                value={primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-zinc-300">
              Cor secundária
            </span>
            <div className="flex gap-3">
              <input
                type="color"
                value={secondaryColor}
                onChange={(event) => setSecondaryColor(event.target.value)}
                className="h-12 w-16 rounded-xl border border-white/10 bg-zinc-900"
              />
              <input
                value={secondaryColor}
                onChange={(event) => setSecondaryColor(event.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
              />
            </div>
          </label>
        </div>
      </Card>

      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-black">Operação</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Regras operacionais do restaurante.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-zinc-300">
              Taxa padrão do garçom (%)
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={defaultServicePercent}
              onChange={(event) =>
                setDefaultServicePercent(event.target.value)
              }
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
            />
          </label>

          <div className="space-y-4 rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
            <label className="flex items-center gap-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={allowCashierServicePercentEdit}
                onChange={(event) =>
                  setAllowCashierServicePercentEdit(event.target.checked)
                }
              />
              Permitir alterar taxa no caixa
            </label>

            <label className="flex items-center gap-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={requireTableApproval}
                onChange={(event) =>
                  setRequireTableApproval(event.target.checked)
                }
              />
              Exigir aprovação da mesa
            </label>

            <label className="flex items-center gap-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={requireOrderApproval}
                onChange={(event) =>
                  setRequireOrderApproval(event.target.checked)
                }
              />
              Exigir aprovação dos pedidos
            </label>
          </div>
        </div>
      </Card>

      {message && <p className="text-sm text-zinc-300">{message}</p>}

      <div className="">
        <Button type="submit" disabled={saving} className="min-h-12 w-full rounded-2xl text-sm font-black">
          {saving ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>
    </form>
  );
}
