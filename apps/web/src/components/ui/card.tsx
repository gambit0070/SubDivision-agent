import * as React from "react";
function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return (
    <div
      className={cx(
        "rounded-2xl border border-slate-800/60 bg-slate-900/40 shadow-2xl shadow-black/30 backdrop-blur",
        className
      )}
      {...rest}
    />
  );
}

export function CardHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div className={cx("p-4 md:p-5", className)} {...rest} />;
}

export function CardTitle(
  props: React.HTMLAttributes<HTMLHeadingElement>
) {
  const { className, ...rest } = props;
  return <h3 className={cx("text-lg font-semibold", className)} {...rest} />;
}

export function CardDescription(
  props: React.HTMLAttributes<HTMLParagraphElement>
) {
  const { className, ...rest } = props;
  return <p className={cx("text-sm text-slate-300", className)} {...rest} />;
}

export function CardContent(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div className={cx("p-4 md:p-5 pt-0", className)} {...rest} />;
}