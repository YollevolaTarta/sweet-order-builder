import { useCallback, useEffect, useState } from "react";
import { supabaseYLLT } from "@/lib/supabase-yllt";

export type ToppingCategory = "mermelada" | "frutos_secos" | "mousse";

export type Ingrediente = {
  id: string;
  name: string;
  desc: string | null;
  price: number;
  category: "crema" | ToppingCategory;
  color: string;
  mediaUrl: string | null;
};

export const TOPPING_CATEGORIES: { id: ToppingCategory; name: string }[] = [
  { id: "mermelada", name: "Mermeladas" },
  { id: "frutos_secos", name: "Cremas de frutos secos" },
  { id: "mousse", name: "Mousses" },
];

const PALETTE = [
  "oklch(0.72 0.18 18)",
  "oklch(0.82 0.05 70)",
  "oklch(0.78 0.13 140)",
  "oklch(0.68 0.1 240)",
  "oklch(0.88 0.06 305)",
  "oklch(0.8 0.16 75)",
  "oklch(0.9 0.16 95)",
  "oklch(0.68 0.2 350)",
  "oklch(0.5 0.07 55)",
  "oklch(0.72 0.12 150)",
  "oklch(0.95 0.07 100)",
  "oklch(0.5 0.16 285)",
];

const colorFor = (key: string) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
};

export const isVideo = (url: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);

type State = { items: Ingrediente[]; loading: boolean; error: boolean };
let cache: Ingrediente[] | null = null;

async function fetchIngredientes(): Promise<Ingrediente[]> {
  const { data, error } = await supabaseYLLT
    .from("ingredientes")
    .select("id, nombre, categoria, precio, descripcion, media_url, orden")
    .eq("activo", true)
    .neq("categoria", "visual")
    .order("orden");
  if (error) throw error;
  return (data ?? [])
    .filter((r) => r.categoria !== "visual")
    .map((r) => ({
      id: String(r.id),
      name: r.nombre as string,
      desc: (r.descripcion as string | null)?.trim() || null,
      price: Number(r.precio ?? 0),
      category: r.categoria,
      color: colorFor(String(r.id)),
      mediaUrl: (r.media_url as string | null)?.trim() || null,
    }));
}

export function useIngredientes() {
  const [state, setState] = useState<State>({
    items: cache ?? [],
    loading: !cache,
    error: false,
  });

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: false }));
    fetchIngredientes()
      .then((items) => {
        cache = items;
        setState({ items, loading: false, error: false });
      })
      .catch(() => setState({ items: [], loading: false, error: true }));
  }, []);

  useEffect(() => {
    if (!cache) load();
  }, [load]);

  const creams = state.items.filter((i) => i.category === "crema");
  const toppings = state.items.filter((i) => i.category !== "crema");
  return { creams, toppings, loading: state.loading, error: state.error, retry: load };
}
