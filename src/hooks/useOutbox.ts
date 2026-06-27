import { useCallback, useEffect, useState } from "react";
import { contarPendentes, sincronizarPendentes, OUTBOX_EVENTO } from "@/services/outbox";

// Estado da fila offline + status de rede. Sincroniza ao reconectar e no mount.
export function useOutbox(): {
  online: boolean;
  pendentes: number;
  sincronizando: boolean;
  sincronizarAgora: () => Promise<void>;
} {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [pendentes, setPendentes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);

  const atualizarContagem = useCallback(() => {
    void contarPendentes()
      .then(setPendentes)
      .catch(() => {});
  }, []);

  const sincronizarAgora = useCallback(async () => {
    setSincronizando(true);
    try {
      await sincronizarPendentes();
    } finally {
      setSincronizando(false);
      atualizarContagem();
    }
  }, [atualizarContagem]);

  useEffect(() => {
    atualizarContagem();
    const aoConectar = () => {
      setOnline(true);
      void sincronizarAgora();
    };
    const aoDesconectar = () => setOnline(false);
    window.addEventListener("online", aoConectar);
    window.addEventListener("offline", aoDesconectar);
    window.addEventListener(OUTBOX_EVENTO, atualizarContagem);
    return () => {
      window.removeEventListener("online", aoConectar);
      window.removeEventListener("offline", aoDesconectar);
      window.removeEventListener(OUTBOX_EVENTO, atualizarContagem);
    };
  }, [atualizarContagem, sincronizarAgora]);

  return { online, pendentes, sincronizando, sincronizarAgora };
}
