"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth/auth-service";

export function useLogin() {
  const [loading, setLoading] = useState(false);

  async function handleLogin(
    email: string,
    password: string,
  ) {
    try {
      setLoading(true);

      await signIn(email, password);

      window.location.href = "/master";
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    handleLogin,
  };
}