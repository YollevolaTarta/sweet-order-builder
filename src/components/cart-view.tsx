import { euro } from "@/lib/menu";
import { cartTotal, type CartItem } from "@/lib/cart";

export function CartView({
  cart,
  onRemove,
}: {
  cart: CartItem[];
  onRemove: (uid: string) => void;
}) {
  return (
    <div className="space-y-3">
      {cart.length === 0 && (
        <p className="font-bold text-muted-foreground">Todavía no has añadido ningún postre.</p>
      )}
      {cart.map((item) => (
        <div key={item.uid} className="card-soft flex items-start gap-3 p-4">
          <div className="flex-1">
            <p className="text-lg font-black leading-tight">{item.nombre}</p>
            <p className="text-xs font-extrabold uppercase text-muted-foreground">
              {item.formatName}
            </p>
            {item.detalle.map((d) => (
              <p key={d} className="text-xs font-bold text-muted-foreground">
                · {d}
              </p>
            ))}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-lg font-black text-brand-red">{euro(item.precio)}</span>
            <button
              type="button"
              aria-label={`Quitar ${item.nombre}`}
              onClick={() => onRemove(item.uid)}
              className="rounded-full border-2 border-border px-3 py-1 text-xs font-extrabold"
            >
              Quitar
            </button>
          </div>
        </div>
      ))}
      {cart.length > 0 && (
        <div className="flex items-center justify-between px-1 pt-2">
          <span className="text-lg font-black">Total</span>
          <span className="text-2xl font-black text-brand-red">{euro(cartTotal(cart))}</span>
        </div>
      )}
    </div>
  );
}
