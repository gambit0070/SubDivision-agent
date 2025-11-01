import * as React from "react";
function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}
export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(function Label({ className, ...rest }, ref) {
  return (
    <label ref={ref} className={cx("text-xs font-medium text-slate-300", className)} {...rest} />
  );
});