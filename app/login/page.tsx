import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <p className="mb-2 text-sm font-medium text-orange-400">
              MNS Tech
            </p>

            <h1 className="text-4xl font-bold tracking-tight">
              Quitéria
            </h1>

            <p className="mt-3 text-sm text-zinc-400">
              Sistema inteligente para bares e restaurantes.
            </p>
          </div>

          <LoginForm />

          <p className="mt-6 text-center text-xs text-zinc-500">
            Acesso exclusivo para equipes cadastradas.
          </p>
        </div>
      </section>
    </main>
  );
}