import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";


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

type Order = {
  id: string;
  numero_pedido: number;
  tipo_consumo: string;
  formato: string;
  crema: string;
  topping_1: string | null;
  topping_2: string | null;
  decoracion: boolean;
  estado: string;
  created_at: string;
};

const FORMATO_LABEL: Record<string, string> = {
  abierta: "Tarta abierta",
  lata: "Tarta en lata",
  shake: "Cake shake",
};

function KDS() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("pedidos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (active && data) setOrders(data as Order[]);
    };
    load();

    const channel = supabase
      .channel("pedidos-kds")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => load())
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const setStatus = async (id: string, estado: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, estado } : o)));
    await (supabase as any).from("pedidos").update({ estado }).eq("id", id);
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
                #{String(o.numero_pedido).padStart(2, "0")}
              </span>
              <span className="text-sm font-bold text-muted-foreground">
                {o.tipo_consumo === "comer_ahora" ? "Comer ahora" : "Para llevar"}
              </span>
            </div>
            <p className="mt-2 text-lg font-black">{FORMATO_LABEL[o.formato] ?? o.formato}</p>
            <p className="font-bold">{o.crema}</p>
            <p className="text-sm font-bold text-muted-foreground">
              {[o.topping_1, o.topping_2].filter(Boolean).join(" + ")}
            </p>
            {o.decoracion && (
              <p className="mt-2 inline-block rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">
                📸 Añadir decoración
              </p>
            )}
            <div className="mt-3 flex items-center justify-end">
              <button
                onClick={() => setStatus(o.id, o.estado === "listo" ? "pendiente" : "listo")}
                className="rounded-full bg-brand-red px-4 py-2 text-sm font-extrabold text-brand-red-foreground"
              >
                {o.estado === "listo" ? "Reabrir" : "Listo"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
