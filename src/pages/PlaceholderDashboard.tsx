import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";

// Placeholder por área — substituído pelos painéis reais nos próximos sprints.
export function PlaceholderDashboard({ titulo, proximo }: { titulo: string; proximo: string }) {
  const { profile, role } = useAuth();
  return (
    <AppShell titulo={titulo}>
      <Card>
        <p className="text-cinza-texto">
          Olá, <strong>{profile?.nome}</strong>.
        </p>
        <p className="mt-1 text-sm text-cinza-secundario">
          Papel: <code className="rounded bg-cinza-fundo px-1.5 py-0.5">{role}</code>
        </p>
        <p className="mt-4 text-sm text-cinza-secundario">{proximo}</p>
      </Card>
    </AppShell>
  );
}
