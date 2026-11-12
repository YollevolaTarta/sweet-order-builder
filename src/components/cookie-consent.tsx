// Banner y panel de cookies (T-012, DEC-009 y DEC-010). Textos aprobados por Dirección el 12/11/2026.
// Aprobado por Dirección: no sustituir por el procedimiento de cookies de Lovable sin su aprobación.
// Se monta solo en el layout de /web y en las páginas legales; nunca en la tablet ni en el QR.

import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { getConsent, onOpenCookieSettings, setConsent, subscribe } from "@/lib/consent";
import { cargarPixelSiProcede, revocar, track } from "@/lib/meta-pixel";

const BOTON = "h-11 flex-1 rounded-full px-5 text-sm font-bold";

export function CookieConsent() {
  const consent = useSyncExternalStore(subscribe, getConsent, () => null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [montado, setMontado] = useState(false);
  const [panel, setPanel] = useState(false);
  const [publicidad, setPublicidad] = useState(false);
  const ultimaRuta = useRef<string | null>(null);

  useEffect(() => setMontado(true), []);

  const abrirPanel = () => {
    setPublicidad(getConsent()?.publicidad ?? false);
    setPanel(true);
  };

  useEffect(() => onOpenCookieSettings(abrirPanel), []);

  // PageView al montar y en cada cambio de ruta, sin duplicar.
  useEffect(() => {
    if (!montado || ultimaRuta.current === pathname) return;
    ultimaRuta.current = pathname;
    cargarPixelSiProcede();
    track("PageView");
  }, [montado, pathname]);

  const elegir = (acepta: boolean) => {
    const antes = getConsent();
    setConsent(acepta);
    setPanel(false);
    if (antes?.publicidad && !acepta) {
      revocar();
      return;
    }
    if (acepta && !antes?.publicidad) {
      cargarPixelSiProcede();
      track("PageView");
    }
  };

  if (!montado) return null;

  return (
    <>
      {!consent && !panel && (
        <div
          role="region"
          aria-label="Cookies"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card px-5 py-4 shadow-lg"
        >
          <div className="mx-auto max-w-3xl space-y-3">
            <p className="text-base font-bold">Cookies</p>
            <p className="text-sm leading-relaxed">
              Usamos cookies técnicas para que la web funcione. Si las aceptas, también usaremos
              cookies de publicidad de Meta para medir los resultados de nuestros anuncios en
              Instagram y Facebook. Puedes cambiar tu elección cuando quieras desde «Configurar
              cookies», al final de la página. Más información en la{" "}
              <Link to="/cookies" className="underline">
                Política de cookies
              </Link>
              .
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" className={BOTON} onClick={() => elegir(false)}>
                Rechazar
              </Button>
              <Button type="button" className={BOTON} onClick={abrirPanel}>
                Configurar
              </Button>
              <Button type="button" className={BOTON} onClick={() => elegir(true)}>
                Aceptar
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={panel} onOpenChange={setPanel}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Configurar cookies</DialogTitle>
          <DialogDescription>
            Elige qué cookies aceptas. Guardamos tu elección durante 12 meses.
          </DialogDescription>

          <div className="space-y-4 text-sm leading-relaxed">
            <div className="space-y-1 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-4">
                <p className="font-bold">Necesarias</p>
                <p className="text-xs italic text-muted-foreground">Siempre activas</p>
              </div>
              <p>Hacen que la web y la compra funcionen y recuerdan tu elección sobre cookies.</p>
            </div>

            <div className="space-y-1 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="cookies-publicidad" className="font-bold">
                  Publicidad (Meta)
                </label>
                <Switch
                  id="cookies-publicidad"
                  checked={publicidad}
                  onCheckedChange={setPublicidad}
                />
              </div>
              <p>
                Miden las compras que llegan desde nuestros anuncios en Instagram y Facebook y
                permiten mostrar anuncios a quien ha visitado la web. Duran hasta 90 días.
              </p>
            </div>

            <p>
              <Link to="/cookies" className="underline" onClick={() => setPanel(false)}>
                Política de cookies
              </Link>
            </p>
          </div>

          <Button
            type="button"
            className="h-11 w-full rounded-full font-bold"
            onClick={() => elegir(publicidad)}
          >
            Guardar elección
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
