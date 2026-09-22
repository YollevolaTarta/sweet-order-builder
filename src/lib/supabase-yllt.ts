import { createClient } from "@supabase/supabase-js";

// Proyecto Supabase externo de Yo Llevo la Tarta
const SUPABASE_URL = "https://yseuxchiumkwbcovkowu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZXV4Y2hpdW1rd2Jjb3Zrb3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzY1NDgsImV4cCI6MjEwMzg1MjU0OH0.lZXlL6QfHuilJ5uia92w4KSKeUdwPcn1DUQUjnHQSd0";

export type Pedido = {
  id: string;
  numero_pedido: number;
  store_id: string;
  tipo_consumo: string;
  formato: string;
  crema: string;
  topping_1: string | null;
  topping_2: string | null;
  decoracion: boolean;
  estado: string;
  tipo_pedido: string;
  hora_recogida: string | null;
  created_at: string;
};

export const supabaseYLLT = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
