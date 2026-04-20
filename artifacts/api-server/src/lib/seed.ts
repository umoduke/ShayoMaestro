import { db, productsTable } from "@workspace/db";
import { logger } from "./logger";

const DEFAULT_PRODUCTS = [
  {
    id: "1",
    name: "Casamigos Blanco Tequila",
    shortName: "Casamigos Blanco",
    category: "tequila",
    price: 116000,
    rating: 4.8,
    reviewCount: 312,
    description:
      "Casamigos Blanco is a premium unaged tequila crafted from carefully selected 100% blue Weber agave grown in the highlands of Jalisco, Mexico. Slow-roasted and fermented to produce a clean, crisp tequila with a smooth and refreshing flavor profile. Bright notes of citrus, sweet agave, and subtle hints of vanilla — finishing smooth and well-balanced.",
    shortDescription:
      "Crisp and smooth premium tequila from 100% blue Weber agave. Fresh citrus notes, light sweetness, perfect for sipping or cocktails.",
    ingredients: [
      "100% Blue Weber Agave",
      "Jalisco Highland Water",
      "Citrus Notes",
      "Vanilla Hints",
    ],
    sizes: [
      { label: "750ml", price: 116000 },
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
    sortOrder: 1,
  },
  {
    id: "2",
    name: "Casamigos Reposado Tequila",
    shortName: "Casamigos Reposado",
    category: "tequila",
    price: 123250,
    rating: 4.9,
    reviewCount: 278,
    description:
      "Casamigos Reposado is aged for 7 months in American white oak barrels, giving it a smooth caramel and cocoa complexity that sets it apart. Made from 100% blue Weber agave from the Jalisco highlands. Warm oak, caramel, and agave flavors come together in a perfectly balanced, sippable tequila that's as good neat as it is in a cocktail.",
    shortDescription:
      "Aged 7 months in American oak. Rich caramel, cocoa, and agave notes with exceptional smoothness.",
    ingredients: [
      "100% Blue Weber Agave",
      "Caramel",
      "Cocoa",
      "Oak Barrel Aged 7 Months",
    ],
    sizes: [
      { label: "750ml", price: 123250 },
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
    sortOrder: 2,
  },
  {
    id: "3",
    name: "Clase Azul Añejo Tequila",
    shortName: "Clase Azul Añejo",
    category: "tequila",
    price: 362500,
    rating: 4.9,
    reviewCount: 145,
    description:
      "Clase Azul Añejo is an ultra-premium tequila aged for 25 months in sherry oak casks, yielding a remarkably complex spirit. Hand-crafted in Santa Maria Canchesdé, Oaxaca. Rich dried fruit, dark chocolate, cinnamon, and vanilla notes build into a long, warming finish. Presented in an iconic hand-painted ceramic decanter — a collectible as much as a spirit.",
    shortDescription:
      "Ultra-premium luxury tequila aged 25 months in sherry oak. Dark chocolate, dried fruit, and cinnamon in an iconic hand-painted decanter.",
    ingredients: [
      "100% Blue Weber Agave",
      "Sherry Oak Aged 25 Months",
      "Dark Chocolate",
      "Dried Fruit",
      "Cinnamon",
    ],
    sizes: [{ label: "750ml", price: 362500 }],
    imageUri:
      "https://authenticshayolockerr.com/wp-content/uploads/2026/03/Clase-Azul-Anejo-Tequila-Bottle-1024x1024.webp",
    imageColor: "#1a0d00",
    accentColor: "#d4a843",
    featured: true,
    tags: ["luxury", "limited"],
    origin: "Oaxaca, Mexico",
    abv: "40%",
    sortOrder: 3,
  },
  {
    id: "4",
    name: "Clase Azul Reposado Tequila",
    shortName: "Clase Azul Reposado",
    category: "tequila",
    price: 362500,
    rating: 4.8,
    reviewCount: 198,
    description:
      "Clase Azul Reposado is a handcrafted ultra-premium tequila aged for 8 months in American oak whisky barrels. Produced from 100% organic agave tequilana Weber Blue, it delivers an exceptionally smooth and complex profile with notes of vanilla, coconut, cinnamon, and apple. The iconic hand-painted ceramic bottle makes it as much a work of art as a world-class spirit.",
    shortDescription:
      "Handcrafted and aged 8 months in whisky barrels. Vanilla, coconut, and cinnamon notes in an iconic ceramic bottle.",
    ingredients: [
      "100% Organic Agave Weber Blue",
      "American Oak Aged 8 Months",
      "Vanilla",
      "Coconut",
      "Cinnamon",
    ],
    sizes: [{ label: "750ml", price: 362500 }],
    imageUri:
      "https://authenticshayolockerr.com/wp-content/uploads/2026/03/Clase-Azul-Reposado-Tequila-Bottle-1024x1024.webp",
    imageColor: "#0d1a2a",
    accentColor: "#4a90c8",
    featured: false,
    tags: ["luxury", "artisan"],
    origin: "Jalisco, Mexico",
    abv: "40%",
    sortOrder: 4,
  },
];

export async function seedProductsIfEmpty() {
  try {
    const existing = await db.select({ id: productsTable.id }).from(productsTable).limit(1);
    if (existing.length > 0) return;
    await db.insert(productsTable).values(DEFAULT_PRODUCTS);
    logger.info(`Seeded ${DEFAULT_PRODUCTS.length} default products`);
  } catch (err) {
    logger.error({ err }, "Failed to seed products");
  }
}
