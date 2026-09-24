import { useCallback, useEffect, useState } from "react";
import { supabaseYLLT } from "@/lib/supabase-yllt";
import { STORE_ID } from "@/lib/menu";

export type ToppingCategory = "mermelada" | "frutos_secos" | "mousse";

export type Ingrediente = {
  id: string;
  name: string;
  desc: string | null;
  price: number;
  category: "crema" | ToppingCategory;
  color: string;
  mediaUrl: string | null;
  allergens: string[];
};

export type Alergeno = {
  code: string;
  abbreviation: string;
  name: string;
};

export type AlergenosByCode = Record<string, Alergeno>;

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

type State = { items: Ingrediente[]; allergensByCode: AlergenosByCode; loading: boolean; error: boolean };
type Catalog = { items: Ingrediente[]; allergensByCode: AlergenosByCode };
let cache: Catalog | null = null;

async function fetchIngredientes(): Promise<Catalog> {
  const [ingredientesResult, alergenosResult] = await Promise.all([
    supabaseYLLT
      .from("v_ingredientes_disponibles")
      .select("ingrediente_id, nombre, categoria, precio, descripcion, media_url, alergenos, orden")
      .eq("store_id", STORE_ID)
      .neq("categoria", "visual")
      .order("orden"),
    supabaseYLLT.from("alergenos").select("codigo, sigla, nombre, orden").order("orden"),
  ]);
  if (ingredientesResult.error) throw ingredientesResult.error;
  if (alergenosResult.error) throw alergenosResult.error;
  const items = (ingredientesResult.data ?? [])
    .filter((r) => r.categoria !== "visual")
    .map((r) => ({
      id: String(r.ingrediente_id),
      name: r.nombre as string,
      desc: (r.descripcion as string | null)?.trim() || null,
      price: Number(r.precio ?? 0),
      category: r.categoria,
      color: colorFor(String(r.ingrediente_id)),
      mediaUrl: (r.media_url as string | null)?.trim() || null,
      allergens: Array.isArray(r.alergenos) ? r.alergenos.map(String) : [],
    }));
  const allergensByCode = Object.fromEntries(
    (alergenosResult.data ?? []).map((row) => [
      String(row.codigo),
      { code: String(row.codigo), abbreviation: String(row.sigla), name: String(row.nombre) },
    ]),
  );
  return { items, allergensByCode };
}

export function useIngredientes() {
  const [state, setState] = useState<State>({
    items: cache?.items ?? [],
    allergensByCode: cache?.allergensByCode ?? {},
    loading: !cache,
    error: false,
  });

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: false }));
    fetchIngredientes()
      .then((catalog) => {
        cache = catalog;
        setState({ ...catalog, loading: false, error: false });
      })
      .catch(() => setState({ items: [], allergensByCode: {}, loading: false, error: true }));
  }, []);

  useEffect(() => {
    if (!cache) load();
  }, [load]);

  const creams = state.items.filter((i) => i.category === "crema");
  const toppings = state.items.filter((i) => i.category !== "crema");
  return { creams, toppings, allergensByCode: state.allergensByCode, loading: state.loading, error: state.error, retry: load };
}
