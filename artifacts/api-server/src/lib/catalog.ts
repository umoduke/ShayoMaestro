export interface CatalogSize {
  label: string;
  price: number;
}

export interface CatalogProduct {
  id: string;
  name: string;
  sizes: CatalogSize[];
}

export const CATALOG: CatalogProduct[] = [
  {
    id: "1",
    name: "Casamigos Blanco Tequila",
    sizes: [
      { label: "750ml", price: 116000 },
      { label: "1 Litre", price: 148000 },
    ],
  },
  {
    id: "2",
    name: "Casamigos Reposado Tequila",
    sizes: [
      { label: "750ml", price: 123250 },
      { label: "1 Litre", price: 158000 },
    ],
  },
  {
    id: "3",
    name: "Clase Azul Añejo Tequila",
    sizes: [{ label: "750ml", price: 362500 }],
  },
  {
    id: "4",
    name: "Clase Azul Reposado Tequila",
    sizes: [{ label: "750ml", price: 362500 }],
  },
];

export function lookupPrice(drinkId: string, sizeLabel: string): number | null {
  const product = CATALOG.find((p) => p.id === drinkId);
  if (!product) return null;
  const size = product.sizes.find((s) => s.label === sizeLabel);
  return size ? size.price : null;
}
