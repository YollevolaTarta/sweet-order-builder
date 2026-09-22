import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabaseYLLT } from "@/lib/supabase-yllt";
import { Check, Play } from "lucide-react";
import { CREAMS, FORMATS, STORE_ID, TOPPINGS, TOPPING_CATEGORIES, euro } from "@/lib/menu";

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
  const isOpenTart = format?.id === "tarta-abierta";
  const toppings = toppingIds
    .map((id) => TOPPINGS.find((t) => t.id === id))
    .filter((topping) => topping !== undefined);

  const total = useMemo(() => {
    if (!format) return 0;
    if (isShake) return format.basePrice;
    return format.basePrice + toppings.reduce((s, t) => s + t.price, 0);
  }, [format, isShake, toppings]);

  const stepInfo = useMemo(() => {
    if (isOpenTart) {
      return { label: step, total: 5, progress: (step / 5) * 100 };
    }
    const label = step === 5 ? 4 : step;
    return { label, total: 4, progress: (label / 4) * 100 };
  }, [isOpenTart, step]);

  const canContinue = (() => {
    switch (step) {
      case 0:
        return true;
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
    if (!format || !cream) return;
    if (isOpenTart && wantsPhoto === null) return;
    setSending(true);
    setError(null);
    const { data, error: err } = await supabaseYLLT
      .from("pedidos")
      .insert({
        store_id: STORE_ID,
        formato: format.id === "cake-shake" ? "shake" : format.id === "tarta-lata" ? "lata" : "abierta",
        crema: cream.name,
        topping_1: toppings[0]?.name ?? null,
        topping_2: toppings[1]?.name ?? null,
        decoracion: isOpenTart ? wantsPhoto : false,
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
        {step > 0 && (
          <span className="text-xs font-bold text-muted-foreground">Paso {stepInfo.label} de {stepInfo.total}</span>
        )}
      </header>

      {step > 0 && (
        <div className="px-5 pt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${stepInfo.progress}%` }}
            />
          </div>
        </div>
      )}

      <section
        key={step}
        className={`animate-step-in flex-1 px-5 pt-5 ${step === 0 ? "flex flex-col items-center justify-center pb-10 text-center" : "pb-40"}`}
      >
        {step === 0 && (
          <>
            <h1 className="mb-8 text-4xl font-black leading-tight">Crea tu postre único</h1>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-full bg-primary px-12 py-5 text-xl font-extrabold text-primary-foreground shadow-card"
            >
              Empezar
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="mb-5 text-3xl font-black leading-tight">Elige tu formato</h1>
            <div className="grid gap-4">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFormatId(f.id);
                    setToppingIds([]);
                    setWantsPhoto(f.id === "tarta-abierta" ? null : false);
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
            <h1 className="text-3xl font-black leading-tight">Elige tus toppings</h1>
            <p className="mb-6 text-sm font-bold text-muted-foreground">
              {isShake ? "Elige exactamente 2 — incluidos en el precio" : "Mínimo 1, máximo 2"}
            </p>
            <div className="space-y-7">
              {TOPPING_CATEGORIES.map((category) => (
                <section key={category.id} aria-labelledby={`category-${category.id}`}>
                  <div className="mb-3 flex items-baseline gap-2">
                    <h2 id={`category-${category.id}`} className="text-xl font-black">
                      {category.name}
                    </h2>
                    {!isShake && <span className="text-sm font-extrabold text-brand-red">— {category.priceLabel}</span>}
                  </div>
                  <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
                    {TOPPINGS.filter((topping) => topping.category === category.id).map((topping) => {
                      const selected = toppingIds.includes(topping.id);
                      const disabled = !selected && toppingIds.length >= 2;
                      return (
                        <button
                          key={topping.id}
                          type="button"
                          aria-pressed={selected}
                          disabled={disabled}
                          onClick={() => toggleTopping(topping.id)}
                          className={`card-soft relative w-40 shrink-0 snap-start overflow-hidden p-2 text-left disabled:cursor-not-allowed ${selected ? "card-selected animate-pop" : ""} ${disabled ? "opacity-40" : ""}`}
                        >
                          <span
                            className="relative mb-3 flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl"
                            style={{ backgroundColor: topping.color }}
                            aria-hidden="true"
                          >
                            <span className="flex size-9 items-center justify-center rounded-full bg-card/85 text-foreground shadow-card">
                              <Play className="size-4 fill-current" />
                            </span>
                            {selected && (
                              <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Check className="size-4 stroke-[3]" />
                              </span>
                            )}
                          </span>
                          <span className="block min-h-10 text-sm font-black leading-tight">{topping.name}</span>
                          {!isShake && (
                            <span className="mt-2 block text-sm font-black text-brand-red">{euro(topping.price)}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
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

      {step > 0 && (
        <footer className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 px-5 pb-5 pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <button
              onClick={() => {
                if (step === 5 && !isOpenTart) setStep(3);
                else setStep((s) => (s - 1) as Step);
              }}
              className="rounded-full border-2 border-border px-5 py-4 text-base font-extrabold"
            >
              Atrás
            </button>
            <div className="flex-1">
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Total</p>
              <p className="text-2xl font-black leading-none text-brand-red">{euro(total)}</p>
            </div>
            {step < 5 ? (
              <button
                disabled={!canContinue}
                onClick={() => {
                  if (step === 3) setStep(isOpenTart ? 4 : 5);
                  else setStep((s) => (s + 1) as Step);
                }}
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
      )}
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
