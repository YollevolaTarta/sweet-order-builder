import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabaseYLLT } from "@/lib/supabase-yllt";
import { CREAMS, FORMATS, TOPPINGS, euro, type Mode } from "@/lib/menu";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Configura tu tarta — Yo Llevo la Tarta" },
      {
        name: "description",
        content:
          "Elige formato, crema y toppings y pide tu postre personalizado en menos de 60 segundos.",
      },
      { property: "og:title", content: "Configura tu tarta — Yo Llevo la Tarta" },
      {
        property: "og:description",
        content: "Postres personalizados en formato pequeño. Tu pedido en menos de 60 segundos.",
      },
    ],
  }),
  component: Configurator,
});

type Step = 0 | 1 | 2 | 3 | 4 | 5;

function Swatch({ color, label, className = "" }: { color: string; label: string; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl text-center text-xs font-extrabold uppercase tracking-wide ${className}`}
      style={{ backgroundColor: color, color: "oklch(0.25 0.03 30)" }}
      aria-hidden="true"
    >
      {label}
    </div>
  );
}

function Configurator() {
  const [step, setStep] = useState<Step>(0);
  const [mode, setMode] = useState<Mode | null>(null);
  const [formatId, setFormatId] = useState<string | null>(null);
  const [creamId, setCreamId] = useState<string | null>(null);
  const [toppingIds, setToppingIds] = useState<string[]>([]);
  const [wantsPhoto, setWantsPhoto] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const format = FORMATS.find((f) => f.id === formatId) ?? null;
  const cream = CREAMS.find((c) => c.id === creamId) ?? null;
  const isShake = format?.id === "cake-shake";
  const toppings = toppingIds
    .map((id) => TOPPINGS.find((t) => t.id === id)!)
    .filter(Boolean);

  const total = useMemo(() => {
    if (!format) return 0;
    if (isShake) return format.basePrice;
    return format.basePrice + toppings.reduce((s, t) => s + t.price, 0);
  }, [format, isShake, toppings]);

  const canContinue = (() => {
    switch (step) {
      case 0:
        return !!mode;
      case 1:
        return !!format;
      case 2:
        return !!cream;
      case 3:
        return isShake ? toppingIds.length === 2 : toppingIds.length >= 1;
      case 4:
        return wantsPhoto !== null;
      default:
        return true;
    }
  })();

  const toggleTopping = (id: string) => {
    setToppingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 2 ? prev : [...prev, id],
    );
  };

  const confirm = async () => {
    if (!format || !cream || wantsPhoto === null) return;
    setSending(true);
    setError(null);
    const { data, error: err } = await supabaseYLLT
      .from("pedidos")
      .insert({
        tipo_consumo: mode === "ahora" ? "comer_ahora" : "para_llevar",
        formato: format.id === "cake-shake" ? "shake" : format.id === "tarta-lata" ? "lata" : "abierta",
        crema: cream.name,
        topping_1: toppings[0]?.name ?? null,
        topping_2: toppings[1]?.name ?? null,
        decoracion: wantsPhoto,
        estado: "pendiente",
        tipo_pedido: "en_tienda",
        hora_recogida: null,
      })
      .select("numero_pedido")
      .single();
    setSending(false);
    if (err || !data) {
      setError("No hemos podido enviar el pedido. Inténtalo otra vez.");
      return;
    }
    setOrderNumber(data.numero_pedido);
  };

  if (orderNumber !== null) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-lg font-bold text-muted-foreground">Tu pedido es el</p>
        <p className="animate-pop text-8xl font-black text-brand-red">
          #{String(orderNumber).padStart(2, "0")}
        </p>
        <p className="max-w-xs text-lg font-bold">Te avisamos cuando esté listo 🍰</p>
        <button
          onClick={() => {
            setOrderNumber(null);
            setStep(0);
            setMode(null);
            setFormatId(null);
            setCreamId(null);
            setToppingIds([]);
            setWantsPhoto(null);
          }}
          className="mt-6 rounded-full bg-primary px-8 py-4 text-lg font-extrabold text-primary-foreground shadow-card"
        >
          Nuevo pedido
        </button>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between px-5 pt-4">
        <span className="text-sm font-black tracking-tight">
          Yo Llevo <span className="text-brand-red">la Tarta</span>
        </span>
        <span className="text-xs font-bold text-muted-foreground">Paso {step} de 5</span>
      </header>

      <div className="px-5 pt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((step + 1) / 6) * 100}%` }}
          />
        </div>
      </div>

      <section key={step} className="animate-step-in flex-1 px-5 pb-40 pt-5">
        {step === 0 && (
          <>
            <h1 className="mb-5 text-3xl font-black leading-tight">¿Cómo lo quieres?</h1>
            <div className="grid gap-4">
              {(
                [
                  { id: "ahora", label: "Comer ahora", emoji: "😋" },
                  { id: "llevar", label: "Para llevar", emoji: "🛍️" },
                ] as const
              ).map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    setMode(o.id);
                    setFormatId(null);
                    setToppingIds([]);
                    setStep(1);
                  }}
                  className={`card-soft flex items-center gap-4 p-6 text-left ${mode === o.id ? "card-selected animate-pop" : ""}`}
                >
                  <span className="text-5xl">{o.emoji}</span>
                  <span className="text-2xl font-black">{o.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="mb-5 text-3xl font-black leading-tight">Elige tu formato</h1>
            <div className="grid gap-4">
              {FORMATS.filter((f) => mode && f.modes.includes(mode)).map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFormatId(f.id);
                    setToppingIds([]);
                  }}
                  className={`card-soft flex items-center gap-4 p-4 text-left ${formatId === f.id ? "card-selected animate-pop" : ""}`}
                >
                  <Swatch color={f.color} label={f.name} className="h-20 w-20 shrink-0 p-2" />
                  <div>
                    <p className="text-xl font-black">{f.name}</p>
                    <p className="text-sm font-bold text-muted-foreground">{f.size}</p>
                    <p className="text-base font-extrabold text-brand-red">
                      {f.id === "cake-shake" ? euro(f.basePrice) : `Desde ${euro(f.basePrice)}`}
                    </p>
                    {f.note && (
                      <p className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-xs font-bold">
                        {f.note}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="mb-5 text-3xl font-black leading-tight">Elige tu crema</h1>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {CREAMS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCreamId(c.id)}
                  className={`card-soft w-40 shrink-0 p-3 text-left ${creamId === c.id ? "card-selected animate-pop" : ""}`}
                >
                  <Swatch color={c.color} label={c.name} className="mb-2 h-24 w-full p-2" />
                  <p className="text-base font-black leading-tight">{c.name}</p>
                  <p className="text-xs font-semibold text-muted-foreground">{c.desc}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-3xl font-black leading-tight">Elige tu topping</h1>
            <p className="mb-4 text-sm font-bold text-muted-foreground">
              {isShake ? "Elige exactamente 2 — incluidos en el precio" : "Mínimo 1, máximo 2"}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TOPPINGS.map((t) => {
                const selected = toppingIds.includes(t.id);
                const disabled = !selected && toppingIds.length >= 2;
                return (
                  <button
                    key={t.id}
                    disabled={disabled}
                    onClick={() => toggleTopping(t.id)}
                    className={`card-soft p-2 text-left ${selected ? "card-selected animate-pop" : ""} ${disabled ? "opacity-40" : ""}`}
                  >
                    <Swatch color={t.color} label={t.name} className="mb-2 h-16 w-full p-1" />
                    <p className="text-sm font-black leading-tight">{t.name}</p>
                    <p className="text-[11px] font-semibold text-muted-foreground">{t.desc}</p>
                    {!isShake && (
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-extrabold ${t.price === 2 ? "bg-brand-red text-brand-red-foreground" : "bg-accent text-accent-foreground"}`}
                      >
                        {euro(t.price)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="text-3xl font-black leading-tight">¿Vas a querer sacar foto?</h1>
            <p className="mb-6 text-sm font-bold text-muted-foreground">
              Si es así, añadiremos una decoración especial
            </p>
            <div className="grid gap-4">
              {[
                { v: true, label: "Sí, quiero foto", emoji: "📸" },
                { v: false, label: "No, gracias", emoji: "🙂" },
              ].map((o) => (
                <button
                  key={String(o.v)}
                  onClick={() => {
                    setWantsPhoto(o.v);
                    setStep(5);
                  }}
                  className={`card-soft flex items-center gap-4 p-6 text-left ${wantsPhoto === o.v ? "card-selected animate-pop" : ""}`}
                >
                  <span className="text-4xl">{o.emoji}</span>
                  <span className="text-2xl font-black">{o.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 5 && format && cream && (
          <>
            <h1 className="mb-4 text-3xl font-black leading-tight">Tu pedido</h1>
            <div className="card-soft space-y-3 p-5">
              <Row label="Formato" value={`${format.name} · ${format.size}`} />
              <Row label="Crema" value={cream.name} />
              <Row label="Toppings" value={toppings.map((t) => t.name).join(" + ")} />
              <Row label="Decoración" value={wantsPhoto ? "Sí" : "No"} />
              <hr className="border-border" />
              {isShake ? (
                <Row label="Todo incluido" value={euro(format.basePrice)} />
              ) : (
                <>
                  <Row label="Precio base" value={euro(format.basePrice)} />
                  {toppings.map((t) => (
                    <Row key={t.id} label={t.name} value={euro(t.price)} />
                  ))}
                </>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-lg font-black">Total</span>
                <span className="text-2xl font-black text-brand-red">{euro(total)}</span>
              </div>
            </div>
            {error && <p className="mt-3 text-sm font-bold text-brand-red">{error}</p>}
          </>
        )}
      </section>

      <footer className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 px-5 pb-5 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="rounded-full border-2 border-border px-5 py-4 text-base font-extrabold"
            >
              Atrás
            </button>
          )}
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase text-muted-foreground">Total</p>
            <p className="text-2xl font-black leading-none text-brand-red">{euro(total)}</p>
          </div>
          {step < 5 ? (
            <button
              disabled={!canContinue}
              onClick={() => setStep((s) => (s + 1) as Step)}
              className="rounded-full bg-primary px-8 py-4 text-lg font-extrabold text-primary-foreground shadow-card transition disabled:opacity-40"
            >
              Seguir
            </button>
          ) : (
            <button
              disabled={sending}
              onClick={confirm}
              className="rounded-full bg-brand-red px-7 py-4 text-lg font-extrabold text-brand-red-foreground shadow-pop transition disabled:opacity-50"
            >
              {sending ? "Enviando…" : "CONFIRMAR"}
            </button>
          )}
        </div>
      </footer>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-bold text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-extrabold">{value}</span>
    </div>
  );
}
