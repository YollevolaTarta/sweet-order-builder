import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { lineaVersionLegal } from "@/lib/legal";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="px-5 pt-4">
        <Link to="/web" className="inline-flex items-center py-1">
          <img src="/brand/yllt-isotipo.png" alt="Yo Llevo la Tarta" className="h-7 w-auto" />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-12 pt-6">
        <h1 className="text-3xl font-black leading-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{lineaVersionLegal()}</p>
        <div className="legal-body mt-6 space-y-4 text-base leading-relaxed [&_a]:underline [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function H({ children, id }: { children: ReactNode; id?: string }) {
  return <h2 id={id} className="scroll-mt-5 pt-4 text-xl font-bold">{children}</h2>;
}
export function Email() {
  return <a href="mailto:rrss.yollevolatarta@gmail.com">rrss.yollevolatarta@gmail.com</a>;
}
export function Tel() {
  return <a href="tel:+34637769529">+34 637 769 529</a>;
}
export function Tabla({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead className="bg-muted"><tr>{head.map((h) => <th key={h} className="border-b border-border px-3 py-2 font-bold">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="align-top">{r.map((c, j) => <td key={j} className="border-b border-border px-3 py-2">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
