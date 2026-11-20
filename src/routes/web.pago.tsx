// Página de vuelta desde Redsys (T-014, DEC-011).
// La vuelta (?r=ok o ?r=ko) no dice si el pago se ha hecho: solo cuenta estado_pago_web (servidor).
// Esta página nunca cambia nada: solo consulta el estado y, si se puede, reintenta el pago del MISMO pedido.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  consultarEstadoPago,
  guardarPago,
  irAPagar,
  leerPago,
  mensajePago,
  type EstadoPago,
  type OrigenPago,
} from "@/lib/checkout-web";
import { euro } from "@/lib/menu";
import { track } from "@/lib/meta-pixel";

type Busqueda = { p?: number; r?: "ok" | "ko" };

export const Route = createFileRoute("/web/pago")({
  validateSearch: (s: Record<string, unknown>): Busqueda => {
    const p = Number(s["p"]);
    return {
      ...(Number.isSafeInteger(p) && p > 0 ? { p } : {}),
      ...(s["r"] === "ok" || s["r"] === "ko" ? { r: s["r"] } : {}),
    };
  },
  head: () => ({
    meta: [{ title: "Pago — Yo Llevo la Tarta" }, { name: "robots", content: "noindex" }],
  }),
  component: Pago,
});

const INTERVALO_MS = 2000;
const CONSULTAS = 30; // unos 60 segundos

/** Sin pagar y sin nada que esperar ni reintentar (pedido cancelado, sin intentos posibles…). */
const sinSalida = (e: EstadoPago) =>
  e.pago !== "pagado" &&
  !e.puede_reintentar &&
  e.ultimo_intento !== "pendiente" &&
  e.ultimo_intento !== "abandonado";

function Pago() {
  const { p, r } = Route.useSearch();
  const [montado, setMontado] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [origen, setOrigen] = useState<OrigenPago | null>(null);
  const [emailEscrito, setEmailEscrito] = useState("");
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [estado, setEstado] = useState<EstadoPago | null>(null);
  const [tiempoAgotado, setTiempoAgotado] = useState(false);
  const [ronda, setRonda] = useState(0);
  const [reintentando, setReintentando] = useState(false);
  const [errorReintento, setErrorReintento] = useState<string | null>(null);
  const purchaseEnviado = useRef(false);

  // El email y el origen solo están en esta pestaña (sessionStorage).
  useEffect(() => {
    if (p) {
      const g = leerPago(p);
      if (g) {
        setEmail(g.email);
        setOrigen(g.origen);
      }
    }
    setMontado(true);
  }, [p]);

  // Al volver atrás desde Redsys con la página guardada por el navegador, el botón vuelve a estar activo.
  useEffect(() => {
    const alVolver = (e: PageTransitionEvent) => {
      if (e.persisted) setReintentando(false);
    };
    window.addEventListener("pageshow", alVolver);
    return () => window.removeEventListener("pageshow", alVolver);
  }, []);

  // Consulta el estado cada 2 s durante unos 60 s, hasta tener una respuesta definitiva.
  useEffect(() => {
    if (!p || !email) return;
    let activo = true;
    let consultas = 0;
    let t: ReturnType<typeof setTimeout> | undefined;
    setTiempoAgotado(false);
    const consultar = async () => {
      consultas += 1;
      const e = await consultarEstadoPago(p, email);
      if (!activo) return;
      if (!e.ok) {
        if (e.error === "pedido_no_encontrado") {
          setNoEncontrado(true);
          return;
        }
        // error de red: se vuelve a intentar en la siguiente consulta
      } else {
        setEstado(e);
        const definitivo =
          e.pago === "pagado" ||
          e.ultimo_intento === "incidencia" ||
          e.ultimo_intento === "rechazado" ||
          sinSalida(e);
        if (definitivo) return;
      }
      if (consultas >= CONSULTAS) {
        setTiempoAgotado(true);
        return;
      }
      t = setTimeout(consultar, INTERVALO_MS);
    };
    consultar();
    return () => {
      activo = false;
      if (t) clearTimeout(t);
    };
  }, [p, email, ronda]);

  // Meta Pixel: Purchase solo con el pago confirmado por el servidor y en compras de la campaña.
  // Una vez por pedido. Sin datos personales ni número de pedido.
  useEffect(() => {
    if (!p || estado?.pago !== "pagado" || origen !== "diciembre" || purchaseEnviado.current)
      return;
    purchaseEnviado.current = true;
    const marca = `yllt_purchase_${p}`;
    try {
      if (window.sessionStorage.getItem(marca)) return;
      window.sessionStorage.setItem(marca, "1");
    } catch {
      // sin sessionStorage: se envía igualmente una vez en esta página
    }
    track("Purchase", { value: estado.total, currency: "EUR" });
  }, [p, estado, origen]);

  const reintentar = async () => {
    if (!p || !email) return;
    setReintentando(true);
    setErrorReintento(null);
    const e = await irAPagar({ pedido_id: p, email, origen });
    if (!e) return; // el navegador ya está yendo a Redsys
    setReintentando(false);
    if (e.error === "pedido_ya_pagado") {
      setRonda((n) => n + 1);
      return;
    }
    setErrorReintento(mensajePago(e));
  };

  const verEstado = (ev: FormEvent) => {
    ev.preventDefault();
    const m = emailEscrito.trim();
    if (!p || !m) return;
    guardarPago({ pedido_id: p, email: m, origen: null });
    setNoEncontrado(false);
    setEstado(null);
    setEmail(m);
    setRonda((n) => n + 1);
  };

  const volver = (
    <Button asChild className="mt-6 h-auto rounded-full px-8 py-4 text-lg font-extrabold">
      <Link to="/web">Volver al inicio</Link>
    </Button>
  );

  if (!montado) {
    return (
      <Pantalla>
        <p role="status" className="text-muted-foreground">
          Cargando…
        </p>
      </Pantalla>
    );
  }

  if (!p) {
    return (
      <Pantalla>
        <p className="text-2xl font-black">No encontramos tu pedido</p>
        {volver}
      </Pantalla>
    );
  }

  // Sin email en esta pestaña, o el email no corresponde al pedido: se pide el de la compra.
  if (!email || noEncontrado) {
    return (
      <Pantalla>
        <form onSubmit={verEstado} className="w-full max-w-sm space-y-4">
          <p className="text-2xl font-black">Consulta tu pago</p>
          {noEncontrado && (
            <p role="alert" className="font-bold text-destructive">
              No encontramos ningún pedido con ese email.
            </p>
          )}
          <label className="block text-left">
            <span className="mb-1 block text-xs font-extrabold uppercase text-muted-foreground">
              Email de la compra
            </span>
            <input
              type="email"
              autoComplete="email"
              required
              value={emailEscrito}
              onChange={(e) => setEmailEscrito(e.target.value)}
              className="w-full rounded-2xl border-2 border-border bg-card px-4 py-3 text-base font-bold outline-none focus:border-primary"
            />
          </label>
          <Button
            type="submit"
            className="h-auto w-full rounded-full px-8 py-4 text-lg font-extrabold"
          >
            Ver el estado del pago
          </Button>
        </form>
      </Pantalla>
    );
  }

  if (estado?.pago === "pagado") {
    return (
      <Pantalla>
        {estado.numero ? (
          <>
            <p className="text-lg font-bold text-muted-foreground">Tu pedido es el</p>
            <div className="flex items-center gap-4">
              <img
                src="/brand/yllt-sello.png"
                alt=""
                aria-hidden="true"
                className="h-14 w-14 object-contain"
              />
              <p className="animate-pop font-display text-7xl font-bold text-yllt-naranja">
                {estado.numero}
              </p>
            </div>
          </>
        ) : (
          <p className="text-2xl font-black">Pago confirmado</p>
        )}
        <p className="text-xl font-bold">Total (IVA incluido): {euro(estado.total)}</p>
        {volver}
      </Pantalla>
    );
  }

  if (estado?.ultimo_intento === "incidencia") {
    return (
      <Pantalla>
        <p className="max-w-sm text-2xl font-black">Estamos revisando tu pago. Te escribiremos.</p>
        {volver}
      </Pantalla>
    );
  }

  const noCompletado = estado?.ultimo_intento === "rechazado" || r === "ko";
  if (noCompletado || (estado && sinSalida(estado))) {
    const puede = !!estado?.puede_reintentar;
    return (
      <Pantalla>
        <p className="text-2xl font-black">El pago no se ha completado</p>
        {errorReintento && (
          <p role="alert" className="max-w-sm font-bold text-destructive">
            {errorReintento}
          </p>
        )}
        {puede && (
          <Button
            type="button"
            disabled={reintentando}
            onClick={reintentar}
            className="mt-2 h-auto rounded-full bg-yllt-naranja px-8 py-4 text-lg font-extrabold text-yllt-naranja-foreground hover:bg-yllt-naranja/90"
          >
            {reintentando ? "Abriendo el pago…" : "Volver a intentar el pago"}
          </Button>
        )}
        {volver}
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <p role="status" className="text-2xl font-black">
        Estamos confirmando tu pago…
      </p>
      {tiempoAgotado && (
        <p className="max-w-sm text-lg font-bold">Te llegará un email en cuanto se confirme.</p>
      )}
      {tiempoAgotado && volver}
    </Pantalla>
  );
}

function Pantalla({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      {children}
    </main>
  );
}
