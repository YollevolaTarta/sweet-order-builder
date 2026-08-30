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

export type Topping = { id: string; name: string; price: number; desc: string; color: string };

export const TOPPINGS: Topping[] = [
  { id: "fresa", name: "Mermelada de fresa", price: 1, desc: "Dulce y jugosa", color: "oklch(0.68 0.19 20)" },
  { id: "frambuesa", name: "Mermelada de frambuesa", price: 1, desc: "Ácida y viva", color: "oklch(0.6 0.2 10)" },
  { id: "mango", name: "Mermelada de mango", price: 1, desc: "Tropical y dulce", color: "oklch(0.8 0.16 75)" },
  { id: "maracuya", name: "Mermelada de maracuyá", price: 1, desc: "Exótica y ácida", color: "oklch(0.85 0.15 90)" },
  { id: "nuez", name: "Crema de nuez", price: 1, desc: "Tostada y suave", color: "oklch(0.6 0.06 60)" },
  { id: "almendra", name: "Crema de almendra", price: 1, desc: "Delicada y dulce", color: "oklch(0.82 0.05 70)" },
  { id: "avellana", name: "Crema de avellana", price: 1, desc: "Clásica e intensa", color: "oklch(0.5 0.07 55)" },
  { id: "pecana", name: "Crema de pecana", price: 1, desc: "Caramelizada y densa", color: "oklch(0.55 0.08 50)" },
  { id: "pistacho", name: "Crema de pistacho", price: 2, desc: "Fina y muy aromática", color: "oklch(0.78 0.13 140)" },
  { id: "cafe", name: "Ganache de café", price: 2, desc: "Tostada y profunda", color: "oklch(0.42 0.05 55)" },
  { id: "matcha", name: "Ganache de matcha", price: 2, desc: "Herbal y elegante", color: "oklch(0.72 0.12 150)" },
  { id: "frutas", name: "Ganache de frutas", price: 2, desc: "5 sabores en uno", color: "oklch(0.7 0.16 350)" },
];

export const euro = (n: number) => `${n.toFixed(2).replace(".", ",")}€`;
