import { useEffect, useState } from "react";

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  disabled?: boolean;
}

export function NumberField({
  label,
  value,
  onChange,
  step = 0.1,
  min,
  max,
  suffix,
  disabled,
}: NumberFieldProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      setDraft(String(value));
      return;
    }
    let next = parsed;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    onChange(next);
  };

  return (
    <label className="flex items-center justify-between gap-2 py-[3px]">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          value={draft}
          step={step}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            e.stopPropagation();
          }}
          className="w-[86px] border border-border bg-input px-2 py-1 text-right font-mono text-xs text-foreground outline-none focus:border-ring disabled:opacity-40"
        />
        {suffix && (
          <span className="w-6 font-mono text-[10px] text-muted-foreground">{suffix}</span>
        )}
      </span>
    </label>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function TextField({ label, value, onChange, readOnly }: TextFieldProps) {
  return (
    <label className="flex items-center justify-between gap-2 py-[3px]">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        className="w-[150px] border border-border bg-input px-2 py-1 text-xs text-foreground outline-none focus:border-ring read-only:text-muted-foreground"
      />
    </label>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}

export function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <label className="flex items-center justify-between gap-2 py-[3px]">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-[150px] border border-border bg-input px-2 py-1 text-xs text-foreground outline-none focus:border-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 py-[3px]">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`h-5 w-10 border transition-colors ${
          value ? "border-primary bg-primary/25" : "border-border bg-input"
        }`}
      >
        <span
          className={`block h-3 w-3 translate-y-[2px] bg-foreground transition-transform ${
            value ? "translate-x-[24px] bg-primary" : "translate-x-[3px]"
          }`}
        />
      </button>
    </label>
  );
}

export function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="border-b border-border">
      <header className="flex items-center justify-between bg-secondary/40 px-3 py-1.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/80">
          {title}
        </h3>
        {action}
      </header>
      <div className="px-3 py-2">{children}</div>
    </section>
  );
}
