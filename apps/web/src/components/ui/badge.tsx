import * as React from "react";
function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}
type Props = React.HTMLAttributes<HTMLSpanElement> & { variant?: "secondary" | "default" };

export function Badge({ className, variant, ...rest }: Props) {
  // variant игнорируем, чтобы не падал TS, стилизуй через className
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset",
        className
      )}
      {...rest}
    />
  );
}