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
      className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/70 p-4"
    >
      <p className="mb-3 text-sm font-medium text-orange-400">
        Criar gerente para {restaurant.name}
      </p>

      <div className="grid gap-3 md:grid-cols-3">
        <input
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Nome do gerente"
          required
          className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-orange-500"
        />

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="E-mail do gerente"
          required
          className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-orange-500"
        />

        <input
          type="text"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Senha temporária"
          required
          className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-orange-500"
        />
      </div>

      {message && <p className="mt-3 text-sm text-zinc-300">{message}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Criando gerente..." : "Criar gerente"}
      </button>
    </form>
  );
}