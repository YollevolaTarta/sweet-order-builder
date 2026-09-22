import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabaseYLLT } from "@/lib/supabase-yllt";
import { STORE_ID } from "@/lib/menu";


export const Route = createFileRoute("/kds")({
  head: () => ({
    meta: [
      { title: "KDS Cocina — Yo Llevo la Tarta" },
      { name: "description", content: "Pantalla de cocina con los pedidos entrantes en tiempo real." },
      { property: "og:title", content: "KDS Cocina — Yo Llevo la Tarta" },
      { property: "og:description", content: "Pedidos entrantes en tiempo real para el obrador." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: KDS,
});

type Linea = {
  id: number;
  formato: string;
  crema: string;
  topping_1: string | null;
  topping_2: string | null;
  receta: string | null;
  pack_id: number | null;
  pack_grupo: string | null;
  packs: { nombre: string } | null;
  foto: boolean;
};

type Order = {
  id: number;
  serie: string;
  numero_pedido: number | null;
  tipo_pedido: string;
  franja_recogida: string | null;
  estado: string;
  created_at: string;
  lineas_pedido: Linea[];
};

const FORMATO_LABEL: Record<string, string> = {
  abierta: "Tarta abierta",
  lata: "Tarta en lata",
  shake: "Cake shake",
};

const NEXT_STATUS: Record<string, string> = {
  pendiente: "preparando",
  preparando: "listo",
  listo: "entregado",
};

const NEXT_LABEL: Record<string, string> = {
  pendiente: "Preparar",
  preparando: "Listo",
  listo: "Entregado",
};

function KDS() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabaseYLLT
        .from("pedidos")
        .select("*, lineas_pedido(*, packs(nombre))")
        .eq("store_id", STORE_ID)
        .eq("pago", "pagado")
        .not("estado", "in", "(entregado,cancelado)")
        .order("created_at", { ascending: true })
        .limit(50);
      if (active && data) setOrders(data as Order[]);
    };
    load();

    const channel = supabaseYLLT
      .channel("pedidos-kds")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "lineas_pedido" }, () => load())
      .subscribe();

    return () => {
      active = false;
      supabaseYLLT.removeChannel(channel);
    };
  }, []);

  const advance = async (id: number, estado: string) => {
    const next = NEXT_STATUS[estado];
    if (!next) return;
    setOrders((prev) =>
      next === "entregado"
        ? prev.filter((o) => o.id !== id)
        : prev.map((o) => (o.id === id ? { ...o, estado: next } : o)),
    );
    await supabaseYLLT.from("pedidos").update({ estado: next }).eq("id", id);
  };

  return (
    <main className="min-h-dvh bg-foreground px-5 py-6 text-background">
      <h1 className="mb-5 text-2xl font-black">Cocina · Pedidos</h1>
      {orders.length === 0 && <p className="font-bold opacity-70">Sin pedidos todavía.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((o) => (
          <article
            key={o.id}
            className={`rounded-3xl bg-card p-4 text-card-foreground shadow-card ${o.estado === "listo" ? "opacity-50" : ""}`}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-brand-red">
                {o.serie}-{String(o.numero_pedido ?? 0).padStart(2, "0")}
              </span>
              {(o.tipo_pedido === "recoger" || o.tipo_pedido === "envio") && (
                <span className="rounded-full bg-accent px-3 py-1 text-xs font-black">
                  {o.tipo_pedido === "envio"
                    ? "Envío"
                    : `Recoger ${
                        o.franja_recogida
                          ? new Date(o.franja_recogida).toLocaleTimeString("es-ES", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"
                      }`}
                </span>
              )}
            </div>
            <div className="mt-2 space-y-3">
              {(o.lineas_pedido ?? []).map((l) => (
                <div key={l.id}>
                  <p className="text-lg font-black">{FORMATO_LABEL[l.formato] ?? l.formato}</p>
                  <p className="font-bold">{l.crema}</p>
                  <p className="text-sm font-bold text-muted-foreground">
                    {[l.topping_1, l.topping_2].filter(Boolean).join(" + ")}
                  </p>
                  {l.foto && (
                    <p className="mt-2 inline-block rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">
                      📸 Decoración foto
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-end">
              <button
                onClick={() => advance(o.id, o.estado)}
                className="rounded-full bg-brand-red px-4 py-2 text-sm font-extrabold text-brand-red-foreground"
              >
                {NEXT_LABEL[o.estado] ?? o.estado}
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
