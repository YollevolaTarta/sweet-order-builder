import { createClient } from "@supabase/supabase-js";

// Proyecto Supabase externo de Yo Llevo la Tarta
const SUPABASE_URL = "https://yseuxchiumkwbcovkowu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZXV4Y2hpdW1rd2Jjb3Zrb3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzY1NDgsImV4cCI6MjEwMzg1MjU0OH0.lZXlL6QfHuilJ5uia92w4KSKeUdwPcn1DUQUjnHQSd0";

export type Pedido = {
  id: number;
  store_id: string;
  canal: "tablet" | "qr" | "web";
  serie: "T" | "W";
  numero_pedido: number | null;
  fecha_negocio: string;
  tipo_pedido: "en_tienda" | "recoger" | "envio";
  franja_recogida: string | null;
  estado: "pendiente" | "preparando" | "listo" | "entregado" | "cancelado";
  pago: "pendiente" | "pagado" | "fallido";
  metodo_pago: "maquina" | "pasarela" | "prueba" | null;
  total: number;
  created_at: string;
};

export type LineaPedido = {
  id: number;
  pedido_id: number;
  tipo: "personalizada" | "receta" | "pack";
  formato: "abierta" | "lata" | "shake";
  crema: string;
  topping_1: string | null;
  topping_2: string | null;
  receta: string | null;
  foto: boolean;
  precio: number;
  created_at: string;
};

export const supabaseYLLT = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
