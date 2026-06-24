import { forwardRef, useId, type SelectHTMLAttributes } from "react";

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  erro?: string;
  children: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { label, erro, id, className = "", children, ...rest },
  ref,
) {
  const auto = useId();
  const selId = id ?? auto;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selId} className="text-sm font-medium text-cinza-texto">
        {label}
      </label>
      <select
        ref={ref}
        id={selId}
        aria-invalid={!!erro}
        className={`rounded-lg border border-cinza-borda bg-white px-3.5 py-2.5 text-sm text-cinza-texto focus:border-azul-principal focus:outline-none ${className}`}
        {...rest}
      >
        {children}
      </select>
      {erro && <span role="alert" className="text-xs text-vermelho-critico">{erro}</span>}
    </div>
  );
});
