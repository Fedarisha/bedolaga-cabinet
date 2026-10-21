import type { ReactNode } from 'react';

/** Шаг на салфетке: рукописная цифра, заголовок, содержимое; шаги разделены пунктиром. */
export default function NapkinStep({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b-[1.5px] border-dashed border-dark-700 py-6 first:pt-1 last:border-b-0 last:pb-1">
      <div className="mb-4 flex items-baseline gap-3.5">
        <span
          className="w-7 shrink-0 font-hand text-4xl leading-[0.8] text-accent-500"
          aria-hidden="true"
        >
          {n}
        </span>
        <h2 className="text-xl font-semibold text-dark-50">{title}</h2>
      </div>
      {children}
    </section>
  );
}
