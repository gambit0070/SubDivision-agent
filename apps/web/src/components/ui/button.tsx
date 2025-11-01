import * as React from "react";
function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }
>(function Button({ className, variant = "primary", ...rest }, ref) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const styles =
    variant === "secondary"
      ? "bg-slate-200 text-slate-900 hover:bg-white focus:ring-slate-400/40"
      : "bg-sky-500 text-slate-950 hover:bg-sky-400 focus:ring-sky-500/30";
  return <button ref={ref} className={cx(base, styles, className)} {...rest} />;
});