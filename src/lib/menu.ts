export type Format = {
  id: string;
  name: string;
  size: string;
  basePrice: number;
  note?: string;
  color: string;
};

export const STORE_ID = "Bilbao_CascoViejo";

export const FORMATS: Format[] = [
  {
    id: "tarta-abierta",
    name: "Tarta abierta",
    size: "160 g",
    basePrice: 4.9,
    color: "oklch(0.92 0.06 60)",
  },
  {
    id: "tarta-lata",
    name: "Tarta en lata",
    size: "160 g",
    basePrice: 4.9,
    color: "oklch(0.88 0.05 250)",
  },
  {
    id: "cake-shake",
    name: "Cake shake",
    size: "250 ml",
    basePrice: 7.5,
    note: "2 toppings incluidos",
    color: "oklch(0.88 0.07 20)",
  },
];

export const euro = (n: number) => `${n.toFixed(2).replace(".", ",")}€`;
