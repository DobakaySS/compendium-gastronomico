import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight">
        Compendium Gastronômico
      </h1>
      <p className="max-w-md text-lg text-muted-foreground">
        Sua coleção inteligente de receitas: porções dinâmicas, macros e
        custos.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" nativeButton={false} render={<Link href="/login" />}>
          Entrar
        </Button>
        <Button
          variant="outline"
          size="lg"
          nativeButton={false}
          render={<Link href="/signup" />}
        >
          Criar conta
        </Button>
      </div>
    </main>
  );
}