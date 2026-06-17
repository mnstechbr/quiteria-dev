"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth/auth-service";
import { getCurrentSession } from "@/lib/auth/session-service";
import { isSuperAdmin } from "@/lib/auth/profile-service";

export function useLogin() {
  const [loading, setLoading] = useState(false);

  async function handleLogin(email: string, password: string) {
    try {
      setLoading(true);

      await signIn(email, password);

      const session = await getCurrentSession();

      if (isSuperAdmin(session?.profile ?? null)) {
        window.location.href = "/master";
        return;
      }

      const role = session?.restaurantMembership?.role;

      if (role === "MANAGER") {
        window.location.href = "/manager";
        return;
      }

      if (role === "WAITER") {
        window.location.href = "/waiter";
        return;
      }

      if (role === "KITCHEN") {
        window.location.href = "/kitchen";
        return;
      }

      if (role === "BAR") {
        window.location.href = "/bar";
        return;
      }

      if (role === "CASHIER") {
        window.location.href = "/cashier";
        return;
      }

      throw new Error("Usuário sem permissão de acesso.");
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    handleLogin,
  };
}
