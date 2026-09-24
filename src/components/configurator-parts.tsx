import { Check, Play } from "lucide-react";
import { precioPorFormato, type Formato, type Pack, type Receta } from "@/lib/supabase-yllt";
import { euro } from "@/lib/menu";
import {
  TOPPING_CATEGORIES,
  isVideo,
  useIngredientes,
  type AlergenosByCode,
  type Ingrediente,
} from "@/lib/ingredientes";

function CatalogStatus({ loading, error, retry }: { loading: boolean; error: boolean; retry: () => void }) {
  if (loading) return <p className="py-6 text-center font-bold text-muted-foreground">Cargando ingredientes…</p>;
  if (error)
    return (
      <div className="card-soft p-5 text-center">
        <p className="mb-3 font-extrabold">No hemos podido cargar los ingredientes.</p>
        <button type="button" onClick={retry} className="rounded-full bg-primary px-5 py-2 font-black text-primary-foreground">
          Reintentar
        </button>
      </div>
    );
  return null;
}

function Media({ item }: { item: Ingrediente }) {
  if (!item.mediaUrl) return null;
  return isVideo(item.mediaUrl) ? (
    <video src={item.mediaUrl} className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline />
  ) : (
    <img src={item.mediaUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
  );
}

function AllergenCodes({ codes, dictionary }: { codes: string[]; dictionary: AlergenosByCode }) {
  const allergens = codes.map((code) => dictionary[code]).filter((item) => item !== undefined);
  if (allergens.length === 0) return null;
  return (
    <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
      {allergens.map((allergen, index) => (
        <span key={allergen.code}>
          {index > 0 && <span aria-hidden="true"> · </span>}
          <span title={allergen.name} aria-label={allergen.name}>{allergen.abbreviation}</span>
        </span>
      ))}
    </span>
  );
}

function AllergenLegend({ items, dictionary }: { items: Ingrediente[]; dictionary: AlergenosByCode }) {
  const codes = [...new Set(items.flatMap((item) => item.allergens))].filter((code) => dictionary[code]);
  if (codes.length === 0) return null;
  return (
    <p className="mt-2 text-[11px] font-normal text-muted-foreground">
      {codes.map((code, index) => {
        const allergen = dictionary[code];
        if (!allergen) return null;
        return (
          <span key={code}>
            {index > 0 && <span aria-hidden="true"> · </span>}
            <span title={allergen.name} aria-label={`${allergen.abbreviation}: ${allergen.name}`}>
              {allergen.abbreviation} {allergen.name.toLocaleLowerCase("es")}
            </span>
          </span>
        );
      })}
    </p>
  );
}

export function Swatch({
  color,
  label,
  className = "",
}: {
  color: string;
  label: string;
  className?: string;
}) {
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

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-bold text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-extrabold">{value}</span>
    </div>
  );
}

export const packRecetas = (pack: Pack): Receta[] =>
  (pack.pack_recetas ?? [])
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map((pr) => pr.recetas)
    .filter((r): r is Receta => !!r);

export function CremaPicker({
  creamId,
  onSelect,
}: {
  creamId: string | null;
  onSelect: (id: string) => void;
}) {
  const { creams: CREAMS, allergensByCode, loading, error, retry } = useIngredientes();
  if (loading || error) return <CatalogStatus loading={loading} error={error} retry={retry} />;
  return (
    <div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {CREAMS.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`card-soft w-40 shrink-0 p-3 text-left ${creamId === c.id ? "card-selected animate-pop" : ""}`}
          >
            {c.mediaUrl ? (
              <div className="relative mb-2 h-24 w-full overflow-hidden rounded-2xl"><Media item={c} /></div>
            ) : (
              <Swatch color={c.color} label={c.name} className="mb-2 h-24 w-full p-2" />
            )}
            <p className="text-base font-black leading-tight">{c.name}</p>
            {c.desc && <p className="text-xs font-semibold text-muted-foreground">{c.desc}</p>}
            <AllergenCodes codes={c.allergens} dictionary={allergensByCode} />
          </button>
        ))}
      </div>
      <AllergenLegend items={CREAMS} dictionary={allergensByCode} />
    </div>
  );
}

export function ToppingsPicker({
  toppingIds,
  isShake,
  onToggle,
}: {
  toppingIds: string[];
  isShake: boolean;
  onToggle: (id: string) => void;
}) {
  const { toppings: TOPPINGS, allergensByCode, loading, error, retry } = useIngredientes();
  if (loading || error) return <CatalogStatus loading={loading} error={error} retry={retry} />;
  const rango = (id: string) => {
    const p = TOPPINGS.filter((t) => t.category === id).map((t) => t.price);
    if (!p.length) return "";
    const min = Math.min(...p), max = Math.max(...p);
    const f = (n: number) => `${String(n).replace(".", ",")} €`;
    return min === max ? f(min) : `${f(min)} – ${f(max)}`;
  };
  return (
    <div className="space-y-7">
      {TOPPING_CATEGORIES.filter((c) => TOPPINGS.some((t) => t.category === c.id)).map((category) => (
        <section key={category.id} aria-labelledby={`category-${category.id}`}>
          <div className="mb-3 flex items-baseline gap-2">
            <h2 id={`category-${category.id}`} className="text-xl font-black">
              {category.name}
            </h2>
            {!isShake && (
              <span className="text-sm font-extrabold text-brand-red">— {rango(category.id)}</span>
            )}
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
                  onClick={() => onToggle(topping.id)}
                  className={`card-soft relative w-40 shrink-0 snap-start overflow-hidden p-2 text-left disabled:cursor-not-allowed ${selected ? "card-selected animate-pop" : ""} ${disabled ? "opacity-40" : ""}`}
                >
                  <span
                    className="relative mb-3 flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl"
                    style={{ backgroundColor: topping.color }}
                    aria-hidden="true"
                  >
                    {topping.mediaUrl ? (
                      <Media item={topping} />
                    ) : (
                      <span className="flex size-9 items-center justify-center rounded-full bg-card/85 text-foreground shadow-card">
                        <Play className="size-4 fill-current" />
                      </span>
                    )}
                    {selected && (
                      <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-4 stroke-[3]" />
                      </span>
                    )}
                  </span>
                  <span className="block min-h-10 text-sm font-black leading-tight">{topping.name}</span>
                  {!isShake && (
                    <span className="mt-1 block text-sm font-black text-brand-red">
                      {euro(topping.price)}
                    </span>
                  )}
                  <AllergenCodes codes={topping.allergens} dictionary={allergensByCode} />
                </button>
              );
            })}
          </div>
        </section>
      ))}
      <AllergenLegend items={TOPPINGS} dictionary={allergensByCode} />
    </div>
  );
}

export function CatalogoPicker({
  recetas,
  packs,
  formato,
  recetaId,
  packId,
  loading,
  onSelectReceta,
  onSelectPack,
}: {
  recetas: Receta[];
  packs: Pack[];
  formato: Formato | null;
  recetaId: number | null;
  packId: number | null;
  loading?: boolean;
  onSelectReceta: (id: number | null) => void;
  onSelectPack: (id: number | null) => void;
}) {
  const priceLabel = (item: { precio_abierta: number; precio_lata: number; precio_shake: number }) =>
    formato
      ? euro(precioPorFormato(item, formato))
      : `Desde ${euro(Math.min(item.precio_lata, item.precio_shake))}`;

  return (
    <>
      {loading && <p className="font-bold text-muted-foreground">Cargando…</p>}

      {recetas.length > 0 && (
        <section className="mb-7" aria-labelledby="sec-recetas">
          <h2 id="sec-recetas" className="mb-3 text-xl font-black">
            Recetas
          </h2>
          <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
            {recetas.map((r) => {
              const selected = recetaId === r.receta_id;
              return (
                <button
                  key={r.receta_id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelectReceta(selected ? null : r.receta_id)}
                  className={`card-soft relative w-48 shrink-0 snap-start p-3 text-left ${selected ? "card-selected animate-pop" : ""}`}
                >
                  {selected && (
                    <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-4 stroke-[3]" />
                    </span>
                  )}
                  <span className="block min-h-14 pr-6 text-sm font-black leading-tight">{r.nombre}</span>
                  <span className="mt-2 block text-base font-black text-brand-red">{priceLabel(r)}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {[2, 4, 6].map((size) => {
        const group = packs.filter((p) => p.tamano === size);
        if (group.length === 0) return null;
        return (
          <section key={size} className="mb-7" aria-labelledby={`sec-pack-${size}`}>
            <h2 id={`sec-pack-${size}`} className="mb-3 text-xl font-black">
              Pack {size}
            </h2>
            <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
              {group.map((p) => {
                const selected = packId === p.pack_id;
                return (
                  <button
                    key={p.pack_id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelectPack(selected ? null : p.pack_id)}
                    className={`card-soft relative w-56 shrink-0 snap-start p-3 text-left ${selected ? "card-selected animate-pop" : ""}`}
                  >
                    {selected && (
                      <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-4 stroke-[3]" />
                      </span>
                    )}
                    <span className="block pr-6 text-base font-black leading-tight">{p.nombre}</span>
                    <span className="mt-2 block space-y-0.5">
                      {packRecetas(p).map((r) => (
                        <span key={r.receta_id} className="block text-xs font-bold text-muted-foreground">
                          · {r.nombre}
                        </span>
                      ))}
                    </span>
                    <span className="mt-2 block text-base font-black text-brand-red">{priceLabel(p)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
