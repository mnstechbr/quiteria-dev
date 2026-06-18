import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-zinc-950 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
        <Link
          href="/"
          className="w-fit rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-orange-300 transition active:scale-95"
        >
          ← Início
        </Link>

        <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-300">
              MNS Tech
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight">
              Quitéria
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Entre para acessar a operação do restaurante no painel correto.
            </p>
          </div>

          <LoginForm />
        </div>

        <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm font-bold text-white">Acesso por perfil</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            O sistema direciona automaticamente para gerente, garçom, cozinha,
            bar, caixa ou master conforme o usuário cadastrado.
          </p>
        </div>

        <p className="mt-auto pt-6 text-center text-xs leading-relaxed text-zinc-500">
          Acesso exclusivo para equipes cadastradas.
        </p>
      </section>
    </main>
  );
}
