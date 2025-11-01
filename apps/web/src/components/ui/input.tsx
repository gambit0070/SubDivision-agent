import * as React from "react";
function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={cx(
        "w-full rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 outline-none placeholder:text-slate-400 focus:border-slate-500",
        className
      )}
      {...rest}
    />
  );
});