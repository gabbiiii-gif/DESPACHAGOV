import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  erro?: string;
}

// Campo de senha com botão "Mostrar/Ocultar". Mesma identidade do Input.
export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput(
  { label, erro, id, className = "", ...rest },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  const [ver, setVer] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-cinza-texto">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={ver ? "text" : "password"}
          aria-invalid={!!erro}
          aria-describedby={erro ? `${inputId}-erro` : undefined}
          className={`w-full rounded-lg border border-cinza-borda bg-white px-3.5 py-2.5 pr-16 text-sm text-cinza-texto placeholder:text-cinza-desabilitado focus:border-azul-principal focus:outline-none focus-visible:outline-2 focus-visible:outline-azul-principal ${className}`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVer((v) => !v)}
          aria-label={ver ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={ver}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-medium text-cinza-secundario hover:text-azul-principal"
        >
          {ver ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      {erro && (
        <span id={`${inputId}-erro`} role="alert" className="text-xs text-vermelho-critico">
          {erro}
        </span>
      )}
    </div>
  );
});
