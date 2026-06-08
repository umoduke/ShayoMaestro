export type DrinkCategory =
  | "all"
  | "tequila"
  | "whiskey"
  | "bourbon"
  | "rum"
  | "gin"
  | "vodka"
  | "wine";

export interface Drink {
  id: string;
  name: string;
  shortName: string;
  category: DrinkCategory;
  price: number;
  currency: string;
  rating: number;
  reviewCount: number;
  description: string;
  shortDescription: string;
  ingredients: string[];
  sizes: { label: string; price: number }[];
  imageUri: string;
  imageColor: string;
  accentColor: string;
  featured?: boolean;
  tags?: string[];
  origin?: string;
  abv?: string;
  barcode?: string;
}

export const CATEGORIES: { id: DrinkCategory; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "grid" },
  { id: "tequila", label: "Tequila", icon: "star" },
  { id: "whiskey", label: "Whiskey", icon: "coffee" },
  { id: "bourbon", label: "Bourbon", icon: "droplet" },
  { id: "rum", label: "Rum", icon: "sun" },
  { id: "gin", label: "Gin", icon: "feather" },
  { id: "vodka", label: "Vodka", icon: "zap" },
  { id: "wine", label: "Wine", icon: "droplet" },
];

export const DRINKS: Drink[] = [
  {
    id: "1",
    name: "Casamigos Blanco Tequila",
    shortName: "Casamigos Blanco",
    category: "tequila",
    price: 112350,
    currency: "₦",
    rating: 4.8,
    reviewCount: 312,
    description:
      "Casamigos Blanco is a premium unaged tequila crafted from carefully selected 100% blue Weber agave grown in the highlands of Jalisco, Mexico. Slow-roasted and fermented to produce a clean, crisp tequila with a smooth and refreshing flavor profile. Bright notes of citrus, sweet agave, and subtle hints of vanilla — finishing smooth and well-balanced.",
    shortDescription:
      "Crisp and smooth premium tequila from 100% blue Weber agave. Fresh citrus notes, light sweetness, perfect for sipping or cocktails.",
    ingredients: ["100% Blue Weber Agave", "Jalisco Highland Water", "Citrus Notes", "Vanilla Hints"],
    sizes: [
      { label: "750ml", price: 112350 },
      { label: "1 Litre", price: 148000 },
    ],
    imageUri:
      "https://authenticshayolockerr.com/wp-content/uploads/2026/03/Casamigos-Blanco-Tequila-Bottle-1024x1024.webp",
    imageColor: "#1a3040",
    accentColor: "#5ba3c9",
    featured: true,
    tags: ["bestseller", "premium"],
    origin: "Jalisco, Mexico",
    abv: "40%",
  },
  {
    id: "2",
    name: "Casamigos Reposado Tequila",
    shortName: "Casamigos Reposado",
    category: "tequila",
    price: 118600,
    currency: "₦",
    rating: 4.9,
    reviewCount: 278,
    description:
      "Casamigos Reposado is aged for 7 months in American white oak barrels, giving it a smooth caramel and cocoa complexity that sets it apart. Made from 100% blue Weber agave from the Jalisco highlands. Warm oak, caramel, and agave flavors come together in a perfectly balanced, sippable tequila that's as good neat as it is in a cocktail.",
    shortDescription:
      "Aged 7 months in American oak. Rich caramel, cocoa, and agave notes with exceptional smoothness.",
    ingredients: ["100% Blue Weber Agave", "Caramel", "Cocoa", "Oak Barrel Aged 7 Months"],
    sizes: [
      { label: "750ml", price: 118600 },
      { label: "1 Litre", price: 158000 },
    ],
    imageUri:
      "https://authenticshayolockerr.com/wp-content/uploads/2026/03/Casamigos-Reposado-Tequila-Bottle-1024x1024.webp",
    imageColor: "#3d2810",
    accentColor: "#c9963a",
    featured: true,
    tags: ["popular", "aged"],
    origin: "Jalisco, Mexico",
    abv: "40%",
  },
  {
    id: "3",
    name: "Clase Azul Añejo Tequila",
    shortName: "Clase Azul Añejo",
    category: "tequila",
    price: 362500,
    currency: "₦",
    rating: 4.9,
    reviewCount: 145,
    description:
      "Clase Azul Añejo is an ultra-premium tequila aged for 25 months in sherry oak casks, yielding a remarkably complex spirit. Hand-crafted in Santa Maria Canchesdé, Oaxaca. Rich dried fruit, dark chocolate, cinnamon, and vanilla notes build into a long, warming finish. Presented in an iconic hand-painted ceramic decanter — a collectible as much as a spirit.",
    shortDescription:
      "Ultra-premium luxury tequila aged 25 months in sherry oak. Dark chocolate, dried fruit, and cinnamon in an iconic hand-painted decanter.",
    ingredients: ["100% Blue Weber Agave", "Sherry Oak Aged 25 Months", "Dark Chocolate", "Dried Fruit", "Cinnamon"],
    sizes: [
      { label: "750ml", price: 362500 },
    ],
    imageUri:
      "https://authenticshayolockerr.com/wp-content/uploads/2026/03/Clase-Azul-Anejo-Tequila-Bottle-1024x1024.webp",
    imageColor: "#1a0d00",
    accentColor: "#d4a843",
    featured: true,
    tags: ["luxury", "limited"],
    origin: "Oaxaca, Mexico",
    abv: "40%",
  },
  {
    id: "4",
    name: "Clase Azul Reposado Tequila",
    shortName: "Clase Azul Reposado",
    category: "tequila",
    price: 362500,
    currency: "₦",
    rating: 4.8,
    reviewCount: 198,
    description:
      "Clase Azul Reposado is a handcrafted ultra-premium tequila aged for 8 months in American oak whisky barrels. Produced from 100% organic agave tequilana Weber Blue, it delivers an exceptionally smooth and complex profile with notes of vanilla, coconut, cinnamon, and apple. The iconic hand-painted ceramic bottle makes it as much a work of art as a world-class spirit.",
    shortDescription:
      "Handcrafted and aged 8 months in whisky barrels. Vanilla, coconut, and cinnamon notes in an iconic ceramic bottle.",
    ingredients: ["100% Organic Agave Weber Blue", "American Oak Aged 8 Months", "Vanilla", "Coconut", "Cinnamon"],
    sizes: [
      { label: "750ml", price: 362500 },
    ],
    imageUri:
      "https://authenticshayolockerr.com/wp-content/uploads/2026/03/Clase-Azul-Reposado-Tequila-Bottle-1024x1024.webp",
    imageColor: "#0d1a2a",
    accentColor: "#4a90c8",
    featured: false,
    tags: ["luxury", "artisan"],
    origin: "Jalisco, Mexico",
    abv: "40%",
  },
];

export const FEATURED_DRINKS = DRINKS.filter((d) => d.featured);

export const getDrinksByCategory = (category: DrinkCategory): Drink[] => {
  if (category === "all") return DRINKS;
  return DRINKS.filter((d) => d.category === category);
};

export const getDrinkById = (id: string): Drink | undefined =>
  DRINKS.find((d) => d.id === id);

export const searchDrinks = (query: string): Drink[] => {
  const lower = query.toLowerCase();
  return DRINKS.filter(
    (d) =>
      d.name.toLowerCase().includes(lower) ||
      d.shortDescription.toLowerCase().includes(lower) ||
      d.category.includes(lower) ||
      (d.tags ?? []).some((t) => t.includes(lower)) ||
      (d.origin ?? "").toLowerCase().includes(lower)
  );
};

export const formatPrice = (price: number, currency: string): string => {
  return `${currency}${price.toLocaleString("en-NG")}`;
};
