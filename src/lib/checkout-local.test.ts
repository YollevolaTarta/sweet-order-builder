// Harness automático de T-024 (bun test). Sin red ni base: un servidor simulado imita estado_pago_web,
// crear_pedido_web e iniciar_pago_redsys con las mismas reglas que la M48 (puede_reintentar, incidencia,
// devoluciones). Comprueba el código real de checkout-local.ts que usan /web/configura, /web/diciembre y /web/pago.
import { describe, expect, test } from "bun:test";
import {
  CLAVE_DATOS,
  CLAVE_LOCAL,
  TTL_MS,
  borrarDatos,
  borrarPorPedido,
  decidirAlCargar,
  decidirAlPagar,
  estadoDeRespuesta,
  guardarConfigura,
  guardarDatos,
  guardarDiciembre,
  guardarHuella,
  huellaDe,
  leerDatos,
  leerHuella,
  leerLocal,
  olvidarPedido,
  olvidarPorPedido,
  prepararPago,
  type EstadoServidor,
  type Origen,
} from "./checkout-local";

// ---------- Utilidades ----------

class Memoria {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}
class Rota {
  getItem(): string | null {
    throw new Error("bloqueado");
  }
  setItem() {
    throw new Error("bloqueado");
  }
  removeItem() {
    throw new Error("bloqueado");
  }
}

const H = 60 * 60 * 1000;
const T0 = Date.UTC(2026, 10, 26, 10, 0, 0);
const item = (uid: string, precio = 7.5) => ({
  uid,
  tipo: "personalizada" as const,
  formato: "lata" as const,
  formatName: "Tarta en lata · 200 g",
  nombre: "Tu tarta de Vainilla",
  detalle: ["Pecan"],
  precio,
  foto: false,
  crema_id: 1,
  topping_ids: [2],
});

/** Servidor simulado con las reglas de estado_pago_web (M48/M51). */
class Servidor {
  pedidos = new Map<
    number,
    { email: string; pago: string; cancelado: boolean; intentos: string[]; devolucion: unknown | null }
  >();
  siguiente = 500;
  creados = 0;
  red = true;
  crear(email: string) {
    return async () => {
      this.creados++;
      const id = this.siguiente++;
      this.pedidos.set(id, { email, pago: "pendiente", cancelado: false, intentos: [], devolucion: null });
      return { ok: true as const, pedido_id: id, pago: "pendiente" };
    };
  }
  consultar = async (id: number, email: string): Promise<{ ok: boolean; error?: string }> => {
    if (!this.red) return { ok: false, error: "red" };
    const p = this.pedidos.get(id);
    if (!p || p.email !== email) return { ok: false, error: "pedido_no_encontrado" };
    const ult = p.intentos.at(-1) ?? null;
    return {
      ok: true,
      pago: p.pago,
      ultimo_intento: ult,
      puede_reintentar: p.pago === "pendiente" && !p.cancelado && p.intentos.length < 10 && ult !== "incidencia",
      devolucion: p.devolucion,
    } as EstadoServidor;
  };
  /** iniciar_pago_redsys: un intento nuevo; el anterior pendiente pasa a abandonado. */
  iniciar(id: number) {
    const p = this.pedidos.get(id)!;
    if (p.pago === "pagado") throw new Error("pedido_ya_pagado");
    p.intentos = p.intentos.map((i) => (i === "pendiente" ? "abandonado" : i));
    p.intentos.push("pendiente");
  }
  autorizar(id: number) {
    const p = this.pedidos.get(id)!;
    p.intentos[p.intentos.length - 1] = "autorizado";
    p.pago = "pagado";
  }
  rechazar(id: number) {
    const p = this.pedidos.get(id)!;
    p.intentos[p.intentos.length - 1] = "rechazado";
  }
}

/** Cada «navegador» de prueba tiene su pestaña (sessionStorage) salvo que el caso abra otra. */
const sesionPorDefecto = new WeakMap<Memoria, Memoria>();
const sesionNueva = (local: Memoria) => {
  const s = new Memoria();
  sesionPorDefecto.set(local, s);
  return s;
};

/** Lo que hace «Pagar ahora» en la web: prepararPago y, si toca, un intento nuevo en Redsys. */
async function pagarAhora(
  srv: Servidor,
  local: Memoria,
  origen: Origen,
  firma: string,
  email: string,
  ahora = T0,
  sesion: Memoria = sesionPorDefecto.get(local) ?? sesionNueva(local),
) {
  const r = await prepararPago(origen, firma, email, {
    local,
    sesion,
    ahora: () => ahora,
    consultar: srv.consultar,
    crear: srv.crear(email),
  });
  if (r.tipo === "pagar") srv.iniciar(r.pedidoId);
  return r;
}

/** Lo que hace /web/pago al recibir el estado del servidor. */
async function vueltaAPago(srv: Servidor, local: Memoria, sesion: Memoria, id: number, email: string, ahora = T0) {
  const e = estadoDeRespuesta(await srv.consultar(id, email));
  if (e?.ok && e.pago === "pagado") {
    const o = borrarPorPedido(local, id, ahora);
    if (o) borrarDatos(sesion, o, ahora);
    return "pagado";
  }
  if (decidirAlCargar(e) === "olvidar") olvidarPorPedido(local, id, ahora);
  return e?.ok ? e.ultimo_intento : null;
}

const EMAIL = "cliente@ejemplo.test";
const firmaRecogida = JSON.stringify({ entrega: "recoger", franja: "2026-11-27T17:00:00Z", items: [1], email: EMAIL });
const firmaEnvio = JSON.stringify({ entrega: "envio", cp: "48005", items: [1], email: EMAIL });
const firmaCampana = JSON.stringify({ campana: "diciembre-2026", cantidad: 1, email: EMAIL });

// ---------- Almacenamiento ----------

describe("estructura y caducidad de yllt_checkout_v1", () => {
  test("guarda cesta, entrega, franja y paso, con versión y fecha de creación", () => {
    const s = new Memoria();
    guardarConfigura(s, { cesta: [item("a")], entrega: "recoger", franja: "2026-11-27T17:00:00Z", paso: "checkout" }, T0);
    const raw = JSON.parse(s.getItem(CLAVE_LOCAL)!);
    expect(raw.v).toBe(1);
    expect(raw.configura.creado).toBe(T0);
    expect(raw.diciembre).toBeNull();
    expect(leerLocal(s, T0 + H).configura?.cesta).toHaveLength(1);
  });

  test("la fecha de creación no cambia al editar (la caducidad cuenta desde que nace la cesta)", () => {
    const s = new Memoria();
    guardarConfigura(s, { cesta: [item("a")] }, T0);
    guardarConfigura(s, { cesta: [item("a"), item("b")] }, T0 + 10 * H);
    expect(leerLocal(s, T0 + 10 * H).configura?.creado).toBe(T0);
  });

  test("caso 13 · a las 24 h caduca y se borra; un minuto antes sigue", () => {
    const s = new Memoria();
    guardarConfigura(s, { cesta: [item("a")] }, T0);
    expect(leerLocal(s, T0 + TTL_MS - 60_000).configura).not.toBeNull();
    expect(leerLocal(s, T0 + TTL_MS).configura).toBeNull();
    expect(s.getItem(CLAVE_LOCAL)).toBeNull();
  });

  test("caso 14 · JSON roto, otra versión o fecha del futuro → se descarta sin error", () => {
    const s = new Memoria();
    s.setItem(CLAVE_LOCAL, "{roto");
    expect(leerLocal(s, T0)).toEqual({ v: 1, configura: null, diciembre: null });
    expect(s.getItem(CLAVE_LOCAL)).toBeNull();
    s.setItem(CLAVE_LOCAL, JSON.stringify({ v: 2, configura: { creado: T0, cesta: [item("a")] } }));
    expect(leerLocal(s, T0).configura).toBeNull();
    s.setItem(CLAVE_LOCAL, JSON.stringify({ v: 1, configura: { creado: T0 + 2 * H, cesta: [item("a")] } }));
    expect(leerLocal(s, T0).configura).toBeNull();
  });

  test("valida cada campo: items, pedido, huella, franja, entrega y paso no fiables se descartan", () => {
    const s = new Memoria();
    s.setItem(
      CLAVE_LOCAL,
      JSON.stringify({
        v: 1,
        configura: {
          creado: T0,
          cesta: [item("ok"), { uid: 1 }, "x", { ...item("pack"), tipo: "pack" }],
          entrega: "dron",
          franja: "no es fecha",
          paso: "pago",
          pedido: { id: -3, huella: "abc" },
        },
        diciembre: { creado: T0, cantidad: 0, pedido: { id: 77, huella: "zz" } },
      }),
    );
    const e = leerLocal(s, T0);
    expect(e.configura?.cesta.map((i) => i.uid)).toEqual(["ok"]); // el pack sin datos del pack también fuera
    expect(e.configura?.entrega).toBeNull();
    expect(e.configura?.franja).toBeNull();
    expect(e.configura?.paso).toBeNull();
    expect(e.configura?.pedido).toBeNull();
    expect(e.diciembre?.cantidad).toBeNull();
    expect(e.diciembre?.pedido).toEqual({ id: 77, huella: null }); // de localStorage nunca sale una huella
  });

  test("cesta vacía y sin pedido → no queda nada guardado", () => {
    const s = new Memoria();
    guardarConfigura(s, { cesta: [item("a")] }, T0);
    guardarConfigura(s, { cesta: [] }, T0);
    expect(s.getItem(CLAVE_LOCAL)).toBeNull();
  });

  test("Configurador y diciembre son independientes dentro de la misma clave", () => {
    const s = new Memoria();
    guardarConfigura(s, { cesta: [item("a")], pedido: { id: 1, huella: null } }, T0);
    guardarDiciembre(s, { cantidad: 2, pedido: { id: 2, huella: null } }, T0);
    expect(borrarPorPedido(s, 2, T0)).toBe("diciembre");
    const e = leerLocal(s, T0);
    expect(e.diciembre).toBeNull();
    expect(e.configura?.pedido?.id).toBe(1);
  });

  test("olvidar el pedido conserva la cesta; borrar por pedido quita todo lo de ese origen", () => {
    const s = new Memoria();
    guardarConfigura(s, { cesta: [item("a")], pedido: { id: 9, huella: null } }, T0);
    olvidarPedido(s, "configura", T0);
    expect(leerLocal(s, T0).configura?.cesta).toHaveLength(1);
    expect(leerLocal(s, T0).configura?.pedido).toBeNull();
    guardarConfigura(s, { pedido: { id: 9, huella: null } }, T0);
    expect(borrarPorPedido(s, 9, T0)).toBe("configura");
    expect(s.getItem(CLAVE_LOCAL)).toBeNull();
    expect(borrarPorPedido(s, 9, T0)).toBeNull(); // repetir no hace nada
  });

  test("almacenamiento bloqueado o lleno: nunca rompe la web", () => {
    const s = new Rota();
    expect(() => guardarConfigura(s, { cesta: [item("a")] }, T0)).not.toThrow();
    expect(leerLocal(s, T0)).toEqual({ v: 1, configura: null, diciembre: null });
    expect(() => guardarDatos(s, "configura", { email: EMAIL }, T0)).not.toThrow();
    expect(leerDatos(s, "configura", T0)).toBeNull();
    expect(leerLocal(null, T0).configura).toBeNull();
  });
});

describe("privacidad", () => {
  test("en localStorage no hay datos personales ni de pago", async () => {
    const s = new Memoria();
    const huella = await huellaDe(JSON.stringify({ cliente: { email: EMAIL, telefono: "600000000" } }));
    guardarConfigura(s, { cesta: [item("a")], entrega: "envio", pedido: { id: 5, huella } }, T0);
    expect(s.getItem(CLAVE_LOCAL)!.includes(huella!)).toBe(false); // la huella nunca va a localStorage
    guardarDiciembre(s, { cantidad: 1 }, T0);
    const texto = s.getItem(CLAVE_LOCAL)!;
    for (const prohibido of ["@", "600000000", "email", "telefono", "direccion", "Ds_", "firma", "pagado", "importe", "huella"]) {
      expect(texto.includes(prohibido)).toBe(false);
    }
  });

  test("los datos del formulario van solo a sessionStorage, sin vacíos y con caducidad", () => {
    const local = new Memoria();
    const sesion = new Memoria();
    guardarDatos(sesion, "configura", { nombre: "Ana", email: EMAIL, telefono: "" }, T0);
    expect(local.getItem(CLAVE_DATOS)).toBeNull();
    expect(leerDatos(sesion, "configura", T0)).toEqual({ nombre: "Ana", email: EMAIL });
    expect(leerDatos(sesion, "diciembre", T0)).toBeNull();
    expect(leerDatos(sesion, "configura", T0 + TTL_MS)).toBeNull();
    expect(sesion.getItem(CLAVE_DATOS)).toBeNull();
  });

  test("la huella vive solo en la pestaña y solo vale para su pedido", async () => {
    const sesion = new Memoria();
    const h = (await huellaDe("x"))!;
    guardarHuella(sesion, "configura", { id: 7, valor: h }, T0);
    expect(leerHuella(sesion, "configura", 7, T0)).toBe(h);
    expect(leerHuella(sesion, "configura", 8, T0)).toBeNull();
    expect(leerHuella(sesion, "diciembre", 7, T0)).toBeNull();
    expect(leerHuella(new Memoria(), "configura", 7, T0)).toBeNull(); // otra pestaña
    borrarDatos(sesion, "configura", T0);
    expect(leerHuella(sesion, "configura", 7, T0)).toBeNull();
    expect(sesion.getItem(CLAVE_DATOS)).toBeNull();
  });

  test("una huella escrita a mano en localStorage se ignora", () => {
    const s = new Memoria();
    s.setItem(CLAVE_LOCAL, JSON.stringify({ v: 1, configura: { creado: T0, cesta: [item("a")], pedido: { id: 3, huella: "a".repeat(64) } } }));
    expect(leerLocal(s, T0).configura?.pedido).toEqual({ id: 3, huella: null });
  });

  test("campos desconocidos o enormes no se guardan", () => {
    const sesion = new Memoria();
    // @ts-expect-error campo no permitido
    guardarDatos(sesion, "diciembre", { email: EMAIL, tarjeta: "4548...", ciudad: "x".repeat(300) }, T0);
    expect(leerDatos(sesion, "diciembre", T0)).toEqual({ email: EMAIL });
  });
});

describe("huella", () => {
  test("determinista, SHA-256 en hex y distinta si cambia cualquier dato", async () => {
    const a = await huellaDe(firmaRecogida);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await huellaDe(firmaRecogida)).toBe(a);
    expect(await huellaDe(firmaRecogida.replace("17:00", "17:15"))).not.toBe(a);
  });
});

// ---------- Decisiones (siempre con el servidor) ----------

const est = (o: Partial<Extract<EstadoServidor, { ok: true }>>): EstadoServidor => ({
  ok: true,
  pago: "pendiente",
  ultimo_intento: "rechazado",
  puede_reintentar: true,
  devolucion: null,
  ...o,
});
const G = { id: 10, huella: "a".repeat(64) };

describe("decidirAlPagar (antes de crear otro pedido)", () => {
  test("sin pedido guardado → crear", () => {
    expect(decidirAlPagar(null, G.huella, null).accion).toBe("crear");
  });
  test("pedido guardado y sin respuesta del servidor → no se crea nada", () => {
    expect(decidirAlPagar(G, G.huella, null).accion).toBe("reintentar_mas_tarde");
    expect(decidirAlPagar(G, G.huella, { ok: false, error: "error_interno" }).accion).toBe("reintentar_mas_tarde");
  });
  test("pedido que el servidor no reconoce con este email → soltar y crear", () => {
    expect(decidirAlPagar(G, G.huella, { ok: false, error: "pedido_no_encontrado" }).accion).toBe("olvidar_y_crear");
  });
  test("caso 17 · pagado en el servidor → ir a /web/pago, aunque la cesta haya cambiado", () => {
    expect(decidirAlPagar(G, "b".repeat(64), est({ pago: "pagado", ultimo_intento: "autorizado" }))).toEqual({
      accion: "ir_a_pago",
      pedidoId: 10,
    });
  });
  test("incidencia sin devolución → ir a /web/pago (no crear otro que se pueda cobrar dos veces)", () => {
    expect(decidirAlPagar(G, G.huella, est({ ultimo_intento: "incidencia", puede_reintentar: false })).accion).toBe(
      "ir_a_pago",
    );
  });
  test("pendiente, reintentable y misma huella → reutilizar", () => {
    expect(decidirAlPagar(G, G.huella, est({}))).toEqual({ accion: "reutilizar", pedidoId: 10 });
    expect(decidirAlPagar(G, G.huella, est({ ultimo_intento: "pendiente" })).accion).toBe("reutilizar");
    expect(decidirAlPagar(G, G.huella, est({ ultimo_intento: "abandonado" })).accion).toBe("reutilizar");
  });
  test("cesta cambiada → soltar y crear (comportamiento aceptado; el anterior caduca según la M48)", () => {
    expect(decidirAlPagar(G, "b".repeat(64), est({})).accion).toBe("olvidar_y_crear");
  });
  test("sin huella (navegador sin SHA-256) → nunca reutiliza", () => {
    expect(decidirAlPagar({ id: 10, huella: null }, null, est({})).accion).toBe("olvidar_y_crear");
    expect(decidirAlPagar(G, null, est({})).accion).toBe("olvidar_y_crear");
  });
  test("casos 15 y 16 · cancelado, sin intentos o con devolución → soltar y crear", () => {
    expect(decidirAlPagar(G, G.huella, est({ puede_reintentar: false })).accion).toBe("olvidar_y_crear");
    expect(
      decidirAlPagar(G, G.huella, est({ puede_reintentar: false, ultimo_intento: "incidencia", devolucion: {} })).accion,
    ).toBe("olvidar_y_crear");
  });
});

describe("decidirAlCargar (reconstruir la pantalla)", () => {
  test("matriz", () => {
    expect(decidirAlCargar(null)).toBe("sin_comprobar");
    expect(decidirAlCargar({ ok: false, error: "error_interno" })).toBe("sin_comprobar");
    expect(decidirAlCargar({ ok: false, error: "pedido_no_encontrado" })).toBe("olvidar");
    expect(decidirAlCargar(est({ pago: "pagado" }))).toBe("ir_a_pago");
    expect(decidirAlCargar(est({ ultimo_intento: "incidencia", puede_reintentar: false }))).toBe("ir_a_pago");
    expect(decidirAlCargar(est({ ultimo_intento: "pendiente" }))).toBe("conservar");
    expect(decidirAlCargar(est({ puede_reintentar: false }))).toBe("olvidar");
    expect(decidirAlCargar(est({ devolucion: { motivo: "pedido_no_pendiente" } }))).toBe("olvidar");
  });
  test("un error de red nunca se toma como respuesta", () => {
    expect(estadoDeRespuesta({ ok: false, error: "red" })).toBeNull();
    expect(estadoDeRespuesta({ ok: false, error: "pedido_no_encontrado" })).toEqual({
      ok: false,
      error: "pedido_no_encontrado",
    });
  });
});

// ---------- Los 20 casos (lógica, con servidor simulado) ----------

describe("20 casos de T-024", () => {
  test("1 · recogida → Redsys → autorizado: un pedido, un intento, cesta borrada al confirmar", async () => {
    const srv = new Servidor();
    const local = new Memoria();
    const sesion = new Memoria();
    guardarConfigura(local, { cesta: [item("a")], entrega: "recoger" }, T0);
    guardarDatos(sesion, "configura", { email: EMAIL }, T0);
    const r = await pagarAhora(srv, local, "configura", firmaRecogida, EMAIL);
    expect(r.tipo).toBe("pagar");
    if (r.tipo !== "pagar") return;
    expect(leerLocal(local, T0).configura?.pedido?.id).toBe(r.pedidoId); // guardado tras confirmar el servidor
    srv.autorizar(r.pedidoId);
    expect(await vueltaAPago(srv, local, sesion, r.pedidoId, EMAIL)).toBe("pagado");
    expect(leerLocal(local, T0).configura).toBeNull();
    expect(leerDatos(sesion, "configura", T0)).toBeNull();
    expect(srv.creados).toBe(1);
  });

  test("2 · recogida → rechazado → reintento → autorizado: mismo pedido, dos intentos", async () => {
    const srv = new Servidor();
    const local = new Memoria();
    guardarConfigura(local, { cesta: [item("a")] }, T0);
    const r1 = await pagarAhora(srv, local, "configura", firmaRecogida, EMAIL);
    if (r1.tipo !== "pagar") throw new Error();
    srv.rechazar(r1.pedidoId);
    expect(await vueltaAPago(srv, local, new Memoria(), r1.pedidoId, EMAIL)).toBe("rechazado");
    expect(leerLocal(local, T0).configura?.cesta).toHaveLength(1); // cesta y pedido conservados
    const r2 = await pagarAhora(srv, local, "configura", firmaRecogida, EMAIL);
    expect(r2).toEqual({ tipo: "pagar", pedidoId: r1.pedidoId });
    srv.autorizar(r1.pedidoId);
    expect(srv.creados).toBe(1);
    expect(srv.pedidos.get(r1.pedidoId)!.intentos).toEqual(["rechazado", "autorizado"]);
  });

  test("3 · recogida → abandono → volver → reintento: mismo pedido, intento anterior abandonado", async () => {
    const srv = new Servidor();
    const local = new Memoria();
    guardarConfigura(local, { cesta: [item("a")] }, T0);
    const r1 = await pagarAhora(srv, local, "configura", firmaRecogida, EMAIL);
    if (r1.tipo !== "pagar") throw new Error();
    expect(decidirAlCargar(estadoDeRespuesta(await srv.consultar(r1.pedidoId, EMAIL)))).toBe("conservar");
    const r2 = await pagarAhora(srv, local, "configura", firmaRecogida, EMAIL, T0 + 5 * 60_000);
    expect(r2).toEqual({ tipo: "pagar", pedidoId: r1.pedidoId });
    expect(srv.pedidos.get(r1.pedidoId)!.intentos).toEqual(["abandonado", "pendiente"]);
    expect(srv.creados).toBe(1);
  });

  test("4 · envío → autorizado", async () => {
    const srv = new Servidor();
    const local = new Memoria();
    guardarConfigura(local, { cesta: [item("a")], entrega: "envio" }, T0);
    const r = await pagarAhora(srv, local, "configura", firmaEnvio, EMAIL);
    if (r.tipo !== "pagar") throw new Error();
    srv.autorizar(r.pedidoId);
    expect(await vueltaAPago(srv, local, new Memoria(), r.pedidoId, EMAIL)).toBe("pagado");
    expect(srv.creados).toBe(1);
  });

  test("5 · envío → rechazado: cesta y pedido se conservan para reintentar", async () => {
    const srv = new Servidor();
    const local = new Memoria();
    guardarConfigura(local, { cesta: [item("a")], entrega: "envio" }, T0);
    const r = await pagarAhora(srv, local, "configura", firmaEnvio, EMAIL);
    if (r.tipo !== "pagar") throw new Error();
    srv.rechazar(r.pedidoId);
    await vueltaAPago(srv, local, new Memoria(), r.pedidoId, EMAIL);
    expect(leerLocal(local, T0).configura?.pedido?.id).toBe(r.pedidoId);
    expect(leerLocal(local, T0).configura?.entrega).toBe("envio");
  });

  test("6 · campaña → autorizado", async () => {
    const srv = new Servidor();
    const local = new Memoria();
    guardarDiciembre(local, { cantidad: 1 }, T0);
    const r = await pagarAhora(srv, local, "diciembre", firmaCampana, EMAIL);
    if (r.tipo !== "pagar") throw new Error();
    expect(leerLocal(local, T0).diciembre?.pedido?.id).toBe(r.pedidoId);
    srv.autorizar(r.pedidoId);
    expect(await vueltaAPago(srv, local, new Memoria(), r.pedidoId, EMAIL)).toBe("pagado");
    expect(leerLocal(local, T0).diciembre).toBeNull();
  });

  test("7 · campaña → rechazado → reintento: no se crea ni reserva otro pack", async () => {
    const srv = new Servidor();
    const local = new Memoria();
    guardarDiciembre(local, { cantidad: 1 }, T0);
    const r1 = await pagarAhora(srv, local, "diciembre", firmaCampana, EMAIL);
    if (r1.tipo !== "pagar") throw new Error();
    srv.rechazar(r1.pedidoId);
    const r2 = await pagarAhora(srv, local, "diciembre", firmaCampana, EMAIL);
    expect(r2).toEqual({ tipo: "pagar", pedidoId: r1.pedidoId });
    expect(srv.creados).toBe(1);
  });

  test("8 · recarga antes de pagar: cesta, entrega y franja vuelven; no se crea nada", () => {
    const local = new Memoria();
    const sesion = new Memoria();
    guardarConfigura(local, { cesta: [item("a")], entrega: "recoger", franja: "2026-11-27T17:00:00Z", paso: "checkout" }, T0);
    guardarDatos(sesion, "configura", { nombre: "Ana", email: EMAIL }, T0);
    const tras = leerLocal(local, T0 + 60_000).configura;
    expect(tras?.cesta).toHaveLength(1);
    expect(tras?.franja).toBe("2026-11-27T17:00:00Z");
    expect(tras?.paso).toBe("checkout");
    expect(tras?.pedido).toBeNull();
    expect(leerDatos(sesion, "configura", T0 + 60_000)?.nombre).toBe("Ana");
  });

  test("9 · recarga en la pantalla de resultado: no reaparece la cesta y repetir no rompe nada", async () => {
    const srv = new Servidor();
    const local = new Memoria();
    guardarConfigura(local, { cesta: [item("a")] }, T0);
    const r = await pagarAhora(srv, local, "configura", firmaRecogida, EMAIL);
    if (r.tipo !== "pagar") throw new Error();
    srv.autorizar(r.pedidoId);
    await vueltaAPago(srv, local, new Memoria(), r.pedidoId, EMAIL);
    expect(await vueltaAPago(srv, local, new Memoria(), r.pedidoId, EMAIL)).toBe("pagado");
    expect(leerLocal(local, T0).configura).toBeNull();
    expect(srv.creados).toBe(1);
  });

  test("10 · cerrar la pestaña y volver: vuelve la cesta, no los datos personales; se consulta y se crea otro", async () => {
    const srv = new Servidor();
    const local = new Memoria();
    const pestaña1 = new Memoria();
    guardarConfigura(local, { cesta: [item("a")] }, T0);
    guardarDatos(pestaña1, "configura", { email: EMAIL }, T0);
    const r1 = await pagarAhora(srv, local, "configura", firmaRecogida, EMAIL, T0, pestaña1);
    if (r1.tipo !== "pagar") throw new Error();
    const pestaña2 = new Memoria();
    expect(leerDatos(pestaña2, "configura", T0 + H)).toBeNull();
    expect(leerLocal(local, T0 + H).configura?.cesta).toHaveLength(1);
    expect(leerLocal(local, T0 + H).configura?.pedido?.id).toBe(r1.pedidoId);
    // Sin la huella (era de la otra pestaña) no se puede asegurar que sea el mismo pedido: se consulta
    // al servidor (regla 3), se suelta el anterior (sin pagar, caduca según la M48) y se crea otro.
    let consultas = 0;
    const r2 = await prepararPago("configura", firmaRecogida, EMAIL, {
      local,
      sesion: pestaña2,
      ahora: () => T0 + H,
      consultar: async (...a) => (consultas++, srv.consultar(...a)),
      crear: srv.crear(EMAIL),
    });
    expect(consultas).toBe(1);
    expect(r2.tipo === "pagar" && r2.pedidoId !== r1.pedidoId).toBe(true);
    expect(srv.pedidos.get(r1.pedidoId)!.pago).toBe("pendiente");
  });

  test("10b · pero si el anterior ya está pagado, no se crea otro aunque la pestaña sea nueva", async () => {
    const srv = new Servidor();
    const local = new Memoria();
    guardarConfigura(local, { cesta: [item("a")] }, T0);
    const r1 = await pagarAhora(srv, local, "configura", firmaRecogida, EMAIL, T0, new Memoria());
    if (r1.tipo !== "pagar") throw new Error();
    srv.autorizar(r1.pedidoId);
    expect(await pagarAhora(srv, local, "configura", firmaRecogida, EMAIL, T0 + H, new Memoria())).toEqual({
      tipo: "ir_a_pago",
      pedidoId: r1.pedidoId,
    });
    expect(srv.creados).toBe(1);
  });

  test("11 · «Atrás» desde Redsys (página recargada): mismo pedido, ningún pedido nuevo", async () => {
    const srv = new Servidor();
    const local = new Memoria();
    guardarDiciembre(local, { cantidad: 2 }, T0);
    const r1 = await pagarAhora(srv, local, "diciembre", firmaCampana, EMAIL);
    if (r1.tipo !== "pagar") throw new Error();
    expect(decidirAlCargar(estadoDeRespuesta(await srv.consultar(r1.pedidoId, EMAIL)))).toBe("conservar");
    expect(leerLocal(local, T0).diciembre?.cantidad).toBe(2);
    await pagarAhora(srv, local, "diciembre", firmaCampana, EMAIL);
    expect(srv.creados).toBe(1);
  });

  test("12 · «Hacer un pedido nuevo»: limpia lo local, no toca el pedido pagado, el siguiente es otro", async () => {
    const srv = new Servidor();
    const local = new Memoria();
    const sesion = new Memoria();
    guardarConfigura(local, { cesta: [item("a")] }, T0);
    guardarDatos(sesion, "configura", { email: EMAIL }, T0);
    const r1 = await pagarAhora(srv, local, "configura", firmaRecogida, EMAIL);
    if (r1.tipo !== "pagar") throw new Error();
    srv.autorizar(r1.pedidoId);
    borrarPorPedido(local, r1.pedidoId, T0);
    borrarDatos(sesion, "configura", T0);
    expect(local.getItem(CLAVE_LOCAL)).toBeNull();
    expect(sesion.getItem(CLAVE_DATOS)).toBeNull();
    expect(srv.pedidos.get(r1.pedidoId)!.pago).toBe("pagado");
    guardarConfigura(local, { cesta: [item("b")] }, T0);
    const r2 = await pagarAhora(srv, local, "configura", firmaRecogida, EMAIL);
    expect(r2.tipo === "pagar" && r2.pedidoId !== r1.pedidoId).toBe(true);
  });

  test("13 · estado local caducado: se crea pedido nuevo sin consultar el viejo", async () => {
    const srv = new Servidor();
    const local = new Memoria();
    guardarConfigura(local, { cesta: [item("a")], pedido: { id: 999, huella: null } }, T0);
    let consultas = 0;
    const r = await prepararPago("configura", firmaRecogida, EMAIL, {
      local,
      sesion: new Memoria(),
      ahora: () => T0 + 25 * H,
      consultar: async (...a) => (consultas++, srv.consultar(...a)),
      crear: srv.crear(EMAIL),
    });
    expect(consultas).toBe(0);
    expect(r.tipo).toBe("pagar");
  });

  test("14 · estado local corrupto: se ignora y se sigue con normalidad", async () => {
    const srv = new Servidor();
    const local = new Memoria();
    local.setItem(CLAVE_LOCAL, "\u0000basura");
    const r = await pagarAhora(srv, local, "configura", firmaRecogida, EMAIL);
    expect(r.tipo).toBe("pagar");
    expect(srv.creados).toBe(1);
  });

  test("15 · pedido cancelado: se suelta el vínculo, la cesta se conserva", async () => {
    const srv = new Servidor();
    const local = new Memoria();
    guardarConfigura(local, { cesta: [item("a")] }, T0);
    const r1 = await pagarAhora(srv, local, "configura", firmaRecogida, EMAIL);
    if (r1.tipo !== "pagar") throw new Error();
    srv.pedidos.get(r1.pedidoId)!.cancelado = true;
    await vueltaAPago(srv, local, new Memoria(), r1.pedidoId, EMAIL);
    expect(leerLocal(local, T0).configura?.pedido).toBeNull();
    expect(leerLocal(local, T0).configura?.cesta).toHaveLength(1);
    const r2 = await pagarAhora(srv, local, "configura", firmaRecogida, EMAIL);
    expect(r2.tipo === "pagar" && r2.pedidoId !== r1.pedidoId).toBe(true);
  });

  test("16 · pedido con devolución (sin sitio) → se suelta; doble cobro (pagado) → nunca se paga de nuevo", async () => {
    const srv = new Servidor();
    const local = new Memoria();
    guardarConfigura(local, { cesta: [item("a")] }, T0);
    const r1 = await pagarAhora(srv, local, "configura", firmaRecogida, EMAIL);
    if (r1.tipo !== "pagar") throw new Error();
    const p = srv.pedidos.get(r1.pedidoId)!;
    p.intentos[0] = "incidencia";
    p.devolucion = { motivo: "sin_disponibilidad", estado: "en_tramite", importe: 7.5 };
    await vueltaAPago(srv, local, new Memoria(), r1.pedidoId, EMAIL);
    expect(leerLocal(local, T0).configura?.pedido).toBeNull();
    // Doble cobro: el pedido está pagado.
    const local2 = new Memoria();
    guardarConfigura(local2, { cesta: [item("a")] }, T0);
    const r2 = await pagarAhora(srv, local2, "configura", firmaEnvio, EMAIL);
    if (r2.tipo !== "pagar") throw new Error();
    srv.autorizar(r2.pedidoId);
    srv.pedidos.get(r2.pedidoId)!.devolucion = { motivo: "doble_cobro" };
    expect(await pagarAhora(srv, local2, "configura", firmaEnvio, EMAIL)).toEqual({
      tipo: "ir_a_pago",
      pedidoId: r2.pedidoId,
    });
  });

  test("17 · pagado en el servidor aunque lo local diga pendiente → no se crea ni se paga", async () => {
    const srv = new Servidor();
    const local = new Memoria();
    guardarConfigura(local, { cesta: [item("a")] }, T0);
    const r1 = await pagarAhora(srv, local, "configura", firmaRecogida, EMAIL);
    if (r1.tipo !== "pagar") throw new Error();
    srv.autorizar(r1.pedidoId); // la notificación llegó, pero el cliente no pasó por /web/pago
    const intentos = srv.pedidos.get(r1.pedidoId)!.intentos.length;
    expect(await pagarAhora(srv, local, "configura", firmaRecogida, EMAIL)).toEqual({
      tipo: "ir_a_pago",
      pedidoId: r1.pedidoId,
    });
    expect(srv.creados).toBe(1);
    expect(srv.pedidos.get(r1.pedidoId)!.intentos.length).toBe(intentos);
  });

  test("18 · lo local dice «pagado» y el servidor «pendiente» → manda el servidor", async () => {
    const srv = new Servidor();
    const local = new Memoria();
    guardarConfigura(local, { cesta: [item("a")] }, T0);
    const r1 = await pagarAhora(srv, local, "configura", firmaRecogida, EMAIL);
    if (r1.tipo !== "pagar") throw new Error();
    srv.rechazar(r1.pedidoId);
    const raw = JSON.parse(local.getItem(CLAVE_LOCAL)!);
    raw.configura.pago = "pagado"; // manipulación o versión antigua
    raw.configura.pedido.pagado = true;
    raw.configura.pedido.huella = "f".repeat(64);
    local.setItem(CLAVE_LOCAL, JSON.stringify(raw));
    expect(JSON.stringify(leerLocal(local, T0)).includes("pagado")).toBe(false);
    expect(await pagarAhora(srv, local, "configura", firmaRecogida, EMAIL)).toEqual({
      tipo: "pagar",
      pedidoId: r1.pedidoId,
    });
  });

  test("19 · dos «Pagar ahora» seguidos con lo mismo → un solo pedido (el doble clic simultáneo lo para la pantalla)", async () => {
    const srv = new Servidor();
    const local = new Memoria();
    guardarConfigura(local, { cesta: [item("a")] }, T0);
    await pagarAhora(srv, local, "configura", firmaRecogida, EMAIL);
    await pagarAhora(srv, local, "configura", firmaRecogida, EMAIL);
    expect(srv.creados).toBe(1);
  });

  test("20 · sin red con un pedido guardado → no se crea ningún pedido", async () => {
    const srv = new Servidor();
    const local = new Memoria();
    guardarConfigura(local, { cesta: [item("a")] }, T0);
    await pagarAhora(srv, local, "configura", firmaRecogida, EMAIL);
    srv.red = false;
    expect(await pagarAhora(srv, local, "configura", firmaRecogida, EMAIL)).toEqual({ tipo: "sin_respuesta" });
    expect(srv.creados).toBe(1);
  });

  test("20b · el pedido solo se guarda si el servidor confirma que lo ha creado", async () => {
    const local = new Memoria();
    guardarConfigura(local, { cesta: [item("a")] }, T0);
    const r = await prepararPago("configura", firmaRecogida, EMAIL, {
      local,
      sesion: new Memoria(),
      ahora: () => T0,
      consultar: async () => ({ ok: false, error: "red" }),
      crear: async () => ({ ok: false, error: "franja_completa" }),
    });
    expect(r.tipo).toBe("respuesta_crear");
    expect(leerLocal(local, T0).configura?.pedido).toBeNull();
    const simulado = await prepararPago("configura", firmaRecogida, EMAIL, {
      local,
      sesion: new Memoria(),
      ahora: () => T0,
      consultar: async () => ({ ok: false, error: "red" }),
      crear: async () => ({ ok: true, pedido_id: 1, pago: "pagado" }),
    });
    expect(simulado.tipo).toBe("respuesta_crear"); // modo simulado: igual que hoy
    expect(leerLocal(local, T0).configura?.pedido).toBeNull();
  });
});
