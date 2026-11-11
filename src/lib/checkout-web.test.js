import { beforeEach, expect, mock, test } from "bun:test";

const rpc = mock(async (_name, _args) => ({ data: null, error: null }));
mock.module("@/lib/supabase-yllt", () => ({ supabaseYLLT: { rpc } }));
const { cargarCampana, pedirPresupuesto, confirmarPedido, fechaEnvioLabel, plazoLabel, mensajeError } = await import("./checkout-web");

beforeEach(() => rpc.mockReset());

test("campaign uses the existing public RPC and normalizes its numbers", async () => {
  rpc.mockResolvedValue({ data: { ok: true, codigo: "diciembre-2026", precio_pack: "30.00", envio: "8.90", packs_por_envio: "2", total_un_pack: "38.90", disponibles: "30", tartas: [{ orden: "1", receta_id: "17" }] }, error: null });
  const c = await cargarCampana("diciembre-2026");
  expect(rpc).toHaveBeenCalledWith("campana_publica", { p_codigo: "diciembre-2026" });
  if (!("codigo" in c)) throw new Error("Expected campaign");
  expect(c.precio_pack).toBe(30);
  expect(c.envio).toBe(8.9);
  expect(c.packs_por_envio).toBe(2);
  expect(c.total_un_pack).toBe(38.9);
  expect(c.disponibles).toBe(30);
  expect(c.tartas[0]?.receta_id).toBe(17);
});

test("unavailable campaign response is preserved", async () => {
  const data = { ok: false, error: "campana_no_disponible" };
  rpc.mockResolvedValue({ data, error: null });
  expect(await cargarCampana("diciembre-2026")).toBe(data);
});

test("network failure does not become a campaign", async () => {
  rpc.mockRejectedValue(new Error("offline"));
  expect(await cargarCampana("diciembre-2026")).toEqual({ ok: false, error: "red" });
});

const datos = { store_id: "Bilbao_CascoViejo", entrega: "envio", items: [{ tipo: "campana", campana: "diciembre-2026", cantidad: 3 }], cliente: { codigo_postal: "48005" }, acepta_condiciones: false, acepta_comercial: false };

test("quote sends quantity without prices and preserves server totals and campaign fields", async () => {
  rpc.mockResolvedValue({ data: { ok: true, subtotal: "90", envio: "17.80", total: "107.80", campana: "diciembre-2026", packs: "3", disponibles: "30", fecha_envio: "2026-12-17" }, error: null });
  const q = await pedirPresupuesto(datos);
  expect(rpc).toHaveBeenCalledWith("crear_pedido_web", { p_datos: datos, p_confirmar: false });
  expect(q).toMatchObject({ ok: true, subtotal: 90, envio: 17.8, total: 107.8, campana: "diciembre-2026", packs: 3, disponibles: 30, fecha_envio: "2026-12-17" });
  expect(Object.keys(datos.items[0] ?? {}).sort()).toEqual(["campana", "cantidad", "tipo"]);
});

test("confirmation forwards the last quote total and shipping date in one call", async () => {
  rpc.mockResolvedValue({ data: { ok: false, error: "fecha_envio_actualizada", fecha_envio: "2026-12-17" }, error: null });
  const confirmacion = { ...datos, acepta_condiciones: true, condiciones_version: "vigente", total_esperado: 107.8, fecha_envio_esperada: "2026-12-17" };
  await confirmarPedido(confirmacion);
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(rpc).toHaveBeenCalledWith("crear_pedido_web", { p_datos: confirmacion, p_confirmar: true });
});

test("zero stock and remaining stock have distinct errors", () => {
  expect(mensajeError({ ok: false, error: "campana_agotada", disponibles: 0 })).toBe("Se han agotado los packs.");
  expect(mensajeError({ ok: false, error: "campana_agotada", disponibles: 4 })).toBe("Solo quedan 4 packs.");
});

test("shipping date is December 17 and cutoff is December 16 at 16:00 Madrid", () => {
  expect(fechaEnvioLabel("2026-12-17")).toBe("jueves 17 de diciembre");
  expect(plazoLabel("2026-12-16T15:00:00+00:00")).toBe("miércoles 16 de diciembre a las 16:00");
});