import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabaseYLLT, fetchRecetasYPacks, type Pack, type Receta, type Formato } from "@/lib/supabase-yllt";
import { FORMATS, STORE_ID } from "@/lib/menu";
import type { CartItem } from "@/lib/cart";
import { almacenLocal, guardarConfigura, leerLocal } from "@/lib/checkout-local";

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
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (uid: string) => void;
  clearCart: () => void;
  resetSeleccion: () => void;
  reset: () => void;
  /** T-024: la cesta guardada en el navegador ya se ha leído (siempre tras montar, nunca en el servidor). */
  hidratado: boolean;
  /** T-024: ruta con la que se cargó la página; solo esa ruta puede restaurar el paso guardado. */
  rutaInicial: string | null;
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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hidratado, setHidratado] = useState(false);
  const rutaInicial = useRef<string | null>(null);

  // T-024: al cargar la página se recupera la cesta guardada (sin datos personales; caduca a las 24 h).
  useEffect(() => {
    rutaInicial.current = window.location.pathname;
    const guardada = leerLocal(almacenLocal(), Date.now()).configura?.cesta ?? [];
    if (guardada.length) setCart(guardada);
    setHidratado(true);
  }, []);

  // T-024: cada cambio de la cesta se guarda (cesta vacía y sin pedido → se borra la clave).
  useEffect(() => {
    if (hidratado) guardarConfigura(almacenLocal(), { cesta: cart }, Date.now());
  }, [cart, hidratado]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { recetas: r, packs: pk } = await fetchRecetasYPacks(STORE_ID);
      if (!active) return;
      setRecetas(r);
      setPacks(pk);
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
      cart,
      addToCart: (item: CartItem) => setCart((prev) => [...prev, item]),
      removeFromCart: (uid: string) => setCart((prev) => prev.filter((i) => i.uid !== uid)),
      clearCart: () => setCart([]),
      // Limpia el postre en curso, pero conserva la cesta.
      resetSeleccion: () => {
        setMode(null);
        setFormatId(null);
        setCreamId(null);
        setToppingIds([]);
        setRecetaId(null);
        setPackId(null);
      },
      reset: () => {
        setMode(null);
        setFormatId(null);
        setCreamId(null);
        setToppingIds([]);
        setRecetaId(null);
        setPackId(null);
      },
      hidratado,
      rutaInicial: rutaInicial.current,
    }),
    [recetas, packs, loading, mode, formatId, creamId, toppingIds, recetaId, packId, cart, hidratado],
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
