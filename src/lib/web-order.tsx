import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabaseYLLT, type Pack, type Receta, type Formato } from "@/lib/supabase-yllt";
import { FORMATS } from "@/lib/menu";

// En la web solo se venden tarta en lata y cake shake (nunca tarta abierta,
// por eso no hay pregunta de foto y foto siempre es false).
export const WEB_FORMATS = FORMATS.filter((f) => f.id !== "tarta-abierta");

export type WebMode = "crear" | "recetas";

type Ctx = {
  recetas: Receta[];
  packs: Pack[];
  loading: boolean;
  mode: WebMode | null;
  setMode: (m: WebMode | null) => void;
  formatId: string | null;
  setFormatId: (id: string | null) => void;
  creamId: string | null;
  setCreamId: (id: string | null) => void;
  toppingIds: string[];
  setToppingIds: (ids: string[]) => void;
  recetaId: number | null;
  setRecetaId: (id: number | null) => void;
  packId: number | null;
  setPackId: (id: number | null) => void;
  reset: () => void;
};

const WebOrderContext = createContext<Ctx | null>(null);

export function WebOrderProvider({ children }: { children: ReactNode }) {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<WebMode | null>(null);
  const [formatId, setFormatId] = useState<string | null>(null);
  const [creamId, setCreamId] = useState<string | null>(null);
  const [toppingIds, setToppingIds] = useState<string[]>([]);
  const [recetaId, setRecetaId] = useState<number | null>(null);
  const [packId, setPackId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [r, p] = await Promise.all([
        supabaseYLLT.from("recetas").select("*").eq("activa", true).order("orden"),
        supabaseYLLT
          .from("packs")
          .select("*, pack_recetas(orden, recetas(*))")
          .eq("activo", true)
          .order("orden"),
      ]);
      if (!active) return;
      setRecetas((r.data as Receta[]) ?? []);
      setPacks((p.data as Pack[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      recetas,
      packs,
      loading,
      mode,
      setMode,
      formatId,
      setFormatId,
      creamId,
      setCreamId,
      toppingIds,
      setToppingIds,
      recetaId,
      setRecetaId,
      packId,
      setPackId,
      reset: () => {
        setMode(null);
        setFormatId(null);
        setCreamId(null);
        setToppingIds([]);
        setRecetaId(null);
        setPackId(null);
      },
    }),
    [recetas, packs, loading, mode, formatId, creamId, toppingIds, recetaId, packId],
  );

  return <WebOrderContext.Provider value={value}>{children}</WebOrderContext.Provider>;
}

export function useWebOrder() {
  const ctx = useContext(WebOrderContext);
  if (!ctx) throw new Error("useWebOrder debe usarse dentro de WebOrderProvider");
  return ctx;
}

export const formatoDe = (formatId: string | null): Formato | null =>
  formatId === "cake-shake" ? "shake" : formatId === "tarta-lata" ? "lata" : null;
