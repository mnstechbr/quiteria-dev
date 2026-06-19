import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--q-bg-outer)] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-[linear-gradient(180deg,#0D1512_0%,#080D0B_100%)] px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
        <Link
          href="/"
          className="w-fit rounded-full border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] px-3 py-1.5 text-xs font-bold text-emerald-300 transition active:scale-95"
        >
          Voltar para o site
        </Link>

        <div className="mt-6 q-card rounded-[1.75rem] p-5">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">
              Área operacional
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-[-0.06em]">
              Entrar no Quitéria
            </h1>

            <p className="mt-3 text-sm leading-6 text-[var(--q-muted)]">
              Acesse o painel do restaurante. O sistema direciona cada usuário
              para gerente, garçom, cozinha, bar, caixa ou master conforme o perfil cadastrado.
            </p>
          </div>

          <LoginForm />
        </div>

        <div className="mt-4 q-card-subtle rounded-3xl p-4">
          <p className="text-sm font-bold text-white">Acesso controlado por função</p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--q-muted)]">
            Cada perfil enxerga apenas as ações necessárias para operar mesas,
            pedidos, preparo, fechamento de conta ou administração da plataforma.
          </p>
        </div>

        <p className="mt-auto pt-6 text-center text-xs leading-relaxed text-[var(--q-dim)]">
          Acesso exclusivo para restaurantes e equipes cadastradas.
        </p>
      </section>
    </main>
  );
}
