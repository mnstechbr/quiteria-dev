"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
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
        <span className="q-label">E-mail</span>

        <input
          type="email"
          placeholder="nome@restaurante.com.br"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="q-input"
        />
      </label>

      <label className="block">
        <span className="q-label">Senha</span>

        <input
          type="password"
          placeholder="Digite sua senha"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="q-input"
        />
      </label>

      <Button type="submit" disabled={loading} size="lg" className="w-full">
        {loading ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
