import { forwardRef, useId, type InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  erro?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, erro, id, className = "", ...rest },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-cinza-texto">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!erro}
        aria-describedby={erro ? `${inputId}-erro` : undefined}
        className={`rounded-lg border border-cinza-borda bg-white px-3.5 py-2.5 text-sm text-cinza-texto placeholder:text-cinza-desabilitado focus:border-azul-principal focus:outline-none focus-visible:outline-2 focus-visible:outline-azul-principal ${className}`}
        {...rest}
      />
      {erro && (
        <span id={`${inputId}-erro`} role="alert" className="text-xs text-vermelho-critico">
          {erro}
        </span>
      )}
    </div>
  );
});
