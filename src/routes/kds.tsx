import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { euro } from "@/lib/menu";

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
  order_number: number;
  mode: string;
  format: string;
  cream: string;
  toppings: { name: string; price: number }[];
  wants_photo: boolean;
  total_cents: number;
  status: string;
  created_at: string;
};

function KDS() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (active && data) setOrders(data as unknown as Order[]);
    };
    load();

    const channel = supabase
      .channel("orders-kds")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const setStatus = async (id: string, status: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    await supabase.from("orders").update({ status }).eq("id", id);
  };

  return (
    <main className="min-h-dvh bg-foreground px-5 py-6 text-background">
      <h1 className="mb-5 text-2xl font-black">Cocina · Pedidos</h1>
      {orders.length === 0 && <p className="font-bold opacity-70">Sin pedidos todavía.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((o) => (
          <article
            key={o.id}
            className={`rounded-3xl bg-card p-4 text-card-foreground shadow-card ${o.status === "ready" ? "opacity-50" : ""}`}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-brand-red">
                #{String(o.order_number).padStart(2, "0")}
              </span>
              <span className="text-sm font-bold text-muted-foreground">{o.mode}</span>
            </div>
            <p className="mt-2 text-lg font-black">{o.format}</p>
            <p className="font-bold">{o.cream}</p>
            <p className="text-sm font-bold text-muted-foreground">
              {(o.toppings ?? []).map((t) => t.name).join(" + ")}
            </p>
            {o.wants_photo && (
              <p className="mt-2 inline-block rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">
                📸 Añadir decoración
              </p>
            )}
            <div className="mt-3 flex items-center justify-between">
              <span className="font-black">{euro(o.total_cents / 100)}</span>
              <button
                onClick={() => setStatus(o.id, o.status === "ready" ? "pending" : "ready")}
                className="rounded-full bg-brand-red px-4 py-2 text-sm font-extrabold text-brand-red-foreground"
              >
                {o.status === "ready" ? "Reabrir" : "Listo"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
