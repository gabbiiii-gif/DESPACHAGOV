import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Renderiza um QR code (PNG data URL) a partir de um texto.
export function QrCode({ value, size = 180 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    QRCode.toDataURL(value, { width: size, margin: 1, color: { dark: "#1A3F7A", light: "#FFFFFF" } })
      .then((url) => { if (ativo) setSrc(url); })
      .catch(() => { if (ativo) setSrc(null); });
    return () => { ativo = false; };
  }, [value, size]);

  if (!src) return <div style={{ width: size, height: size }} className="animate-pulse rounded bg-cinza-borda" />;
  return <img src={src} width={size} height={size} alt="QR code" className="rounded" />;
}
