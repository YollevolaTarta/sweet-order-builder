// Cancelación del pedido por el cliente (T-022, M53, DEC-011). Página /web/cancelar.
// - El enlace del email trae #p=<pedido>&t=<firma> en el fragmento. Se lee una sola vez al cargar, la URL
//   se limpia en ese momento y p y t solo viven en memoria (estado de React): nunca en almacenamiento,
//   URL, consola, analítica ni mensajes de error.
// - La página no decide nada: plazo, cocina, importe y devolución los decide el servidor (cancelar_pedido).
//   Solo muestra lo que responde. Abrir la página nunca cancela: solo el botón envía confirmar: true.
// - Sin terceros ni recursos externos (sin píxel, sin fuentes de Google: ver __root.tsx).
// - Ruta fuera del layout /web (`web_`) para que la página no haga más peticiones que cancelar_pedido:
//   el layout carga recetas y packs al montarse.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Email } from "@/components/legal-page";

export const Route = createFileRoute("/web_/cancelar")({
  head: () => ({
    meta: [
      { title: "Cancelar pedido — Yo Llevo la Tarta" },
      { name: "referrer", content: "no-referrer" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Cancelar,
});

// Misma URL del proyecto que SUPABASE_URL en src/lib/supabase-yllt.ts. Llamada directa con fetch:
// la función no pide sesión ni clave.
const URL_CANCELAR = "https://yseuxchiumkwbcovkowu.supabase.co/functions/v1/cancelar_pedido";

const FUENTE_SISTEMA =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

type Estado =
  | "cancelable"
  | "cancelado"
  | "ya_cancelado"
  | "fuera_de_plazo"
  | "en_preparacion"
  | "no_cancelable"
  | "enlace_no_valido"
  | "no_disponible";

const ESTADOS: Estado[] = [
  "cancelable",
  "cancelado",
  "ya_cancelado",
  "fuera_de_plazo",
  "en_preparacion",
  "no_cancelable",
  "enlace_no_valido",
  "no_disponible",
];

type Respuesta = {
  estado: Estado;
  numero: string | null;
  importe: number | null;
  plazo_limite: string | null;
  tipo_pedido: string | null;
  franja_recogida: string | null;
  fecha_envio: string | null;
  devolucion: "en_tramite" | "completada" | null;
};

type Pantalla =
  | { tipo: "cargando" }
  | { tipo: "respuesta"; r: Respuesta }
  | { tipo: "error"; en: "consulta" | "confirmacion" };

const texto = (v: unknown) => (typeof v === "string" && v ? v : null);

/** Solo se aceptan los estados conocidos; cualquier otra cosa cuenta como error. */
function leerRespuesta(d: unknown): Respuesta | null {
  if (!d || typeof d !== "object") return null;
  const o = d as Record<string, unknown>;
  if (!ESTADOS.includes(o["estado"] as Estado)) return null;
  const importe = Number(o["importe"]);
  const dev = o["devolucion"];
  return {
    estado: o["estado"] as Estado,
    numero: texto(o["numero"]),
    importe: o["importe"] == null || Number.isNaN(importe) ? null : importe,
    plazo_limite: texto(o["plazo_limite"]),
    tipo_pedido: texto(o["tipo_pedido"]),
    franja_recogida: texto(o["franja_recogida"]),
    fecha_envio: texto(o["fecha_envio"]),
    devolucion: dev === "en_tramite" || dev === "completada" ? dev : null,
  };
}

/** Única comunicación de la página. Devuelve null si hay error (HTTP no correcto, red o respuesta rara). */
async function llamar(cuerpo: {
  p: string;
  t: string;
  confirmar?: true;
}): Promise<Respuesta | null> {
  try {
    const res = await fetch(URL_CANCELAR, {
      method: "POST",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    if (!res.ok) return null;
    return leerRespuesta(await res.json());
  } catch {
    return null;
  }
}

/** «24,90 €». */
const euros = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

/** Fecha y hora en Madrid: «jueves 26 de noviembre, 18:00». */
function fechaHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const fecha = d
    .toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "Europe/Madrid",
    })
    .replace(",", "");
  const hora = d.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Madrid",
  });
  return `${fecha}, ${hora}`;
}

/** Día sin hora: «jueves 26 de noviembre». Acepta «AAAA-MM-DD» (sin desfase de zona) o una fecha ISO. */
function dia(valor: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  const d = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : new Date(valor);
  if (Number.isNaN(d.getTime())) return "";
  return d
    .toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: m ? "UTC" : "Europe/Madrid",
    })
    .replace(",", "");
}

function Cancelar() {
  // p y t: solo en memoria, mientras la página está abierta.
  const [enlace, setEnlace] = useState<{ p: string; t: string } | null>(null);
  const [pantalla, setPantalla] = useState<Pantalla>({ tipo: "cargando" });
  const [cancelando, setCancelando] = useState(false);
  const leido = useRef(false);
  const enCurso = useRef(false);

  const consultar = useCallback(async (e: { p: string; t: string }) => {
    setPantalla({ tipo: "cargando" });
    const r = await llamar({ p: e.p, t: e.t });
    setPantalla(r ? { tipo: "respuesta", r } : { tipo: "error", en: "consulta" });
  }, []);

  // Lectura única del enlace y limpieza inmediata de la URL, antes de cualquier petición.
  useEffect(() => {
    if (leido.current) return;
    leido.current = true;
    const h = new URLSearchParams(window.location.hash.slice(1));
    const p = h.get("p") ?? "";
    const t = h.get("t") ?? "";
    window.history.replaceState(null, "", "/web/cancelar");
    if (!p || !t) {
      setPantalla({ tipo: "respuesta", r: { ...VACIA, estado: "enlace_no_valido" } });
      return;
    }
    setEnlace({ p, t });
    void consultar({ p, t });
  }, [consultar]);

  const confirmar = async () => {
    if (!enlace || enCurso.current) return; // un segundo clic no hace nada
    enCurso.current = true;
    setCancelando(true);
    const r = await llamar({ p: enlace.p, t: enlace.t, confirmar: true });
    setPantalla(r ? { tipo: "respuesta", r } : { tipo: "error", en: "confirmacion" });
    setCancelando(false);
    enCurso.current = false;
  };

  if (pantalla.tipo === "cargando") {
    return (
      <Marco>
        <p role="status" className="text-muted-foreground">
          Cargando…
        </p>
      </Marco>
    );
  }

  if (pantalla.tipo === "error") {
    const enConsulta = pantalla.en === "consulta";
    return (
      <Marco>
        <p role="alert" className="text-lg font-bold">
          {enConsulta
            ? "No hemos podido cargar tu pedido. Inténtalo de nuevo en unos minutos."
            : "No hemos podido completar la cancelación. Vuelve a intentarlo."}
        </p>
        {enlace && (
          <Button
            type="button"
            disabled={cancelando}
            onClick={() => (enConsulta ? void consultar(enlace) : void confirmar())}
            className="h-auto rounded-full px-8 py-4 text-lg font-extrabold"
          >
            Reintentar
          </Button>
        )}
      </Marco>
    );
  }

  const r = pantalla.r;
  const importe = r.importe != null ? euros(r.importe) : null;
  const plazo = r.plazo_limite ? fechaHora(r.plazo_limite) : "";

  switch (r.estado) {
    case "cancelable":
      return (
        <Marco>
          <Titulo>¿Quieres cancelar tu pedido?</Titulo>
          <div className="space-y-1 text-lg">
            {r.numero && <p className="font-bold">Pedido {r.numero}</p>}
            {r.tipo_pedido === "recoger" && r.franja_recogida && (
              <p>Recogida: {fechaHora(r.franja_recogida)}</p>
            )}
            {r.tipo_pedido === "envio" && r.fecha_envio && (
              <p>Envío: sale el {dia(r.fecha_envio)}</p>
            )}
            {importe && <p>Importe: {importe}</p>}
          </div>
          <p>
            {plazo && <>Puedes cancelarlo hasta el {plazo}. </>}
            {importe && <>Te devolveremos {importe} al mismo medio de pago.</>}
          </p>
          <div className="flex flex-col items-start gap-4">
            <Button
              type="button"
              disabled={cancelando}
              onClick={() => void confirmar()}
              className="h-auto rounded-full px-8 py-4 text-lg font-extrabold"
            >
              {cancelando ? "Cancelando…" : "Sí, cancelar mi pedido"}
            </Button>
            <Link to="/web" className="font-bold underline underline-offset-4">
              No, mantener mi pedido
            </Link>
          </div>
        </Marco>
      );

    case "cancelado":
      return (
        <Marco>
          <Titulo>Tu pedido está cancelado</Titulo>
          <p>
            Hemos cancelado tu pedido{r.numero ? ` ${r.numero}` : ""}.
            {importe &&
              ` Hemos iniciado la devolución completa de ${importe} al mismo medio de pago. Dependiendo de tu banco, puede tardar unos días en aparecer. No necesitas hacer nada.`}
          </p>
          <p>Te enviamos también un email con la confirmación.</p>
        </Marco>
      );

    case "ya_cancelado":
      return (
        <Marco>
          <Titulo>Este pedido ya está cancelado</Titulo>
          {importe && r.devolucion === "en_tramite" && (
            <p>
              Estamos gestionando la devolución completa de {importe} al mismo medio de pago.
              Dependiendo de tu banco, puede tardar unos días en aparecer. No necesitas hacer nada.
            </p>
          )}
          {importe && r.devolucion === "completada" && (
            <p>
              Hemos completado la devolución de {importe} al mismo medio de pago. Dependiendo de tu
              banco, puede tardar unos días en aparecer en tu cuenta.
            </p>
          )}
        </Marco>
      );

    case "fuera_de_plazo":
      return (
        <Marco>
          <Titulo>Ya no se puede cancelar este pedido</Titulo>
          <p>
            El plazo para cancelarlo terminó{plazo ? ` el ${plazo}` : ""}. Si tienes cualquier duda,
            escríbenos a <Email />.
          </p>
        </Marco>
      );

    case "en_preparacion":
      return (
        <Marco>
          <Titulo>Ya estamos preparando tu pedido</Titulo>
          <p>
            Por eso ya no se puede cancelar. Si tienes cualquier duda, escríbenos a <Email />.
          </p>
        </Marco>
      );

    case "no_cancelable":
      return (
        <Marco>
          <Titulo>Este pedido no se puede cancelar desde aquí</Titulo>
          <p>
            Escríbenos a <Email /> con tu número de pedido.
          </p>
        </Marco>
      );

    case "no_disponible":
      return (
        <Marco>
          <p className="text-lg font-bold">
            La cancelación online no está disponible en este momento. Si necesitas cancelar tu
            pedido, escríbenos a <Email /> dentro del plazo de cancelación.
          </p>
        </Marco>
      );

    case "enlace_no_valido":
    default:
      return (
        <Marco>
          <Titulo>Este enlace no es válido</Titulo>
          <p>
            Abre el enlace completo desde el email de tu pedido. Si tienes cualquier duda,
            escríbenos a <Email />.
          </p>
        </Marco>
      );
  }
}

const VACIA: Respuesta = {
  estado: "enlace_no_valido",
  numero: null,
  importe: null,
  plazo_limite: null,
  tipo_pedido: null,
  franja_recogida: null,
  fecha_envio: null,
  devolucion: null,
};

function Titulo({ children }: { children: ReactNode }) {
  return <h1 className="text-3xl font-black leading-tight">{children}</h1>;
}

function Marco({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background" style={{ fontFamily: FUENTE_SISTEMA }}>
      <header className="px-5 pt-4">
        <Link to="/web" className="inline-flex items-center py-1">
          <img src="/brand/yllt-isotipo.png" alt="Yo Llevo la Tarta" className="h-7 w-auto" />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 space-y-5 px-5 pb-12 pt-8 text-base leading-relaxed [&_a]:underline">
        {children}
      </main>
    </div>
  );
}
