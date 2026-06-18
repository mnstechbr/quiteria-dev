"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Restaurant } from "@/types/restaurant";

type CreateManagerFormProps = {
  restaurant: Restaurant;
  onManagerCreated: (restaurantId: string, managerEmail: string) => void;
};

export function CreateManagerForm({
  restaurant,
  onManagerCreated,
}: CreateManagerFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Quiteria@123");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setMessage(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sessão não encontrada. Faça login novamente.");
      }

      const response = await fetch(`/api/restaurants/${restaurant.id}/manager`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fullName,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao criar gerente.");
      }

      onManagerCreated(restaurant.id, data.manager.email);
      setFullName("");
      setEmail("");
      setPassword("Quiteria@123");
      setMessage("Gerente criado e vinculado com sucesso.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Erro ao criar gerente.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-3xl border border-white/10 bg-zinc-950/80 p-4"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">
          Acesso do gerente
        </p>
        <h4 className="mt-2 text-base font-bold text-white">
          Criar gerente
        </h4>
        <p className="mt-1 text-sm leading-6 text-zinc-400">
          Preencha os dados para liberar o acesso administrativo deste restaurante.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-300">
            Nome do gerente
          </span>
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Ex: João Silva"
            required
            className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-4 text-base text-white outline-none placeholder:text-zinc-600 focus:border-orange-500"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-300">
            E-mail do gerente
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="gerente@email.com"
            required
            className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-4 text-base text-white outline-none placeholder:text-zinc-600 focus:border-orange-500"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-300">
            Senha temporária
          </span>
          <input
            type="text"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Senha temporária"
            required
            className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-4 text-base text-white outline-none placeholder:text-zinc-600 focus:border-orange-500"
          />
        </label>
      </div>

      {message && (
        <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-zinc-300">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full rounded-2xl bg-orange-500 px-4 py-4 text-sm font-bold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Criando gerente..." : "Criar gerente"}
      </button>
    </form>
  );
}
