export type Mode = "ahora" | "llevar";

export type Format = {
  id: string;
  name: string;
  size: string;
  basePrice: number;
  note?: string;
  color: string;
  modes: Mode[];
};

export const FORMATS: Format[] = [
  {
    id: "tarta-abierta",
    name: "Tarta abierta",
    size: "160 g",
    basePrice: 4.9,
    color: "oklch(0.92 0.06 60)",
    modes: ["ahora"],
  },
  {
    id: "tarta-lata",
    name: "Tarta en lata",
    size: "160 g",
    basePrice: 4.9,
    color: "oklch(0.88 0.05 250)",
    modes: ["ahora", "llevar"],
  },
  {
    id: "cake-shake",
    name: "Cake shake",
    size: "250 ml",
    basePrice: 7.5,
    note: "2 toppings incluidos",
    color: "oklch(0.88 0.07 20)",
    modes: ["ahora", "llevar"],
  },
];

export type Cream = { id: string; name: string; desc: string; color: string };

export const CREAMS: Cream[] = [
  { id: "vainilla", name: "Vainilla", desc: "Suave, cremosa y aromática", color: "oklch(0.95 0.07 100)" },
  { id: "lemon", name: "Lemon curd", desc: "Intensa, ácida y refrescante", color: "oklch(0.9 0.16 95)" },
  { id: "coulant", name: "Coulant chocolate", desc: "Profunda y fundente", color: "oklch(0.38 0.06 50)" },
  { id: "ny", name: "NY cheesecake", desc: "Densa, rica y equilibrada", color: "oklch(0.96 0.015 90)" },
  { id: "basque", name: "Basque cheesecake", desc: "Cremosa con toque salado", color: "oklch(0.85 0.08 75)" },
];

export type ToppingCategory = "mermeladas" | "frutos-secos" | "mousses";

export type Topping = {
  id: string;
  name: string;
  price: number;
  category: ToppingCategory;
  color: string;
};

export const TOPPING_CATEGORIES: { id: ToppingCategory; name: string; priceLabel: string }[] = [
  { id: "mermeladas", name: "Mermeladas", priceLabel: "1€" },
  { id: "frutos-secos", name: "Cremas de frutos secos", priceLabel: "1€" },
  { id: "mousses", name: "Mousses", priceLabel: "2€" },
];

export const TOPPINGS: Topping[] = [
  { id: "temporada", name: "Mermeladas de temporada", price: 1, category: "mermeladas", color: "oklch(0.72 0.18 18)" },
  { id: "almendra", name: "Almendra", price: 1, category: "frutos-secos", color: "oklch(0.82 0.05 70)" },
  { id: "avellana", name: "Avellana", price: 1, category: "frutos-secos", color: "oklch(0.5 0.07 55)" },
  { id: "pistacho", name: "Pistacho", price: 2, category: "frutos-secos", color: "oklch(0.78 0.13 140)" },
  { id: "pecan", name: "Pecan", price: 1, category: "frutos-secos", color: "oklch(0.55 0.08 50)" },
  { id: "nuez", name: "Nuez", price: 1, category: "frutos-secos", color: "oklch(0.6 0.06 60)" },
  { id: "blue", name: "Blue", price: 2, category: "mousses", color: "oklch(0.68 0.1 240)" },
  { id: "matcha", name: "Matcha", price: 2, category: "mousses", color: "oklch(0.72 0.12 150)" },
  { id: "cafe", name: "Café", price: 2, category: "mousses", color: "oklch(0.42 0.05 55)" },
  { id: "chocolate-blanco-lavanda", name: "Chocolate blanco y lavanda", price: 2, category: "mousses", color: "oklch(0.88 0.06 305)" },
  { id: "chocolate", name: "Chocolate", price: 2, category: "mousses", color: "oklch(0.38 0.06 50)" },
  { id: "pitaya", name: "Pitaya", price: 2, category: "mousses", color: "oklch(0.68 0.2 350)" },
  { id: "mango", name: "Mango", price: 2, category: "mousses", color: "oklch(0.8 0.16 75)" },
  { id: "limon", name: "Limón", price: 2, category: "mousses", color: "oklch(0.9 0.16 95)" },
  { id: "cereza", name: "Cereza", price: 2, category: "mousses", color: "oklch(0.58 0.21 20)" },
  { id: "arandanos", name: "Arándanos", price: 2, category: "mousses", color: "oklch(0.5 0.16 285)" },
];

export const euro = (n: number) => `${n.toFixed(2).replace(".", ",")}€`;
