"use client";

import { FormEvent, useState } from "react";
import { useLogin } from "./useLogin";

export function LoginForm() {
  const { loading, handleLogin } = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await handleLogin(email, password);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-zinc-300">
          E-mail
        </span>

        <input
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="min-h-12 w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-zinc-300">
          Senha
        </span>

        <input
          type="password"
          placeholder="Digite sua senha"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="min-h-12 w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="min-h-12 w-full rounded-2xl bg-orange-500 px-4 py-3 text-base font-black text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
