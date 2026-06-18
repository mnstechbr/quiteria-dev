"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Restaurant } from "@/types/restaurant";

type CreateRestaurantFormProps = {
  onCreated: (restaurant: Restaurant) => void;
};

export function CreateRestaurantForm({
  onCreated,
}: CreateRestaurantFormProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
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

      const response = await fetch("/api/restaurants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name,
          slug,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao criar restaurante.");
      }

      onCreated(data.restaurant);
      setName("");
      setSlug("");
      setMessage("Restaurante criado com sucesso.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao criar restaurante.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-white/10 bg-zinc-900/80 p-5 shadow-xl shadow-black/10"
    >
      <div>
        <h3 className="text-lg font-bold text-white">Novo restaurante</h3>
        <p className="mt-1 text-sm leading-6 text-zinc-400">
          Crie um novo cliente na plataforma Quitéria.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-300">
            Nome do restaurante
          </span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex: Hamburgueria do João"
            required
            className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-300">
            Slug
          </span>
          <input
            type="text"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="Ex: hamburgueria-do-joao"
            className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500"
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
        className="mt-5 w-full rounded-2xl bg-orange-500 px-4 py-4 text-sm font-bold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Criando..." : "Criar restaurante"}
      </button>
    </form>
  );
}
