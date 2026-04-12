export type DrinkCategory =
  | "all"
  | "soft-drinks"
  | "juices"
  | "energy-drinks"
  | "cocktails"
  | "smoothies"
  | "water";

export interface Drink {
  id: string;
  name: string;
  category: DrinkCategory;
  price: number;
  rating: number;
  reviewCount: number;
  description: string;
  ingredients: string[];
  sizes: { label: string; price: number }[];
  imageColor: string;
  accentColor: string;
  featured?: boolean;
  tags?: string[];
}

export const CATEGORIES: { id: DrinkCategory; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "grid" },
  { id: "soft-drinks", label: "Soft Drinks", icon: "cup" },
  { id: "juices", label: "Juices", icon: "leaf" },
  { id: "energy-drinks", label: "Energy", icon: "zap" },
  { id: "cocktails", label: "Cocktails", icon: "star" },
  { id: "smoothies", label: "Smoothies", icon: "droplet" },
  { id: "water", label: "Water", icon: "wind" },
];

export const DRINKS: Drink[] = [
  {
    id: "1",
    name: "Arctic Blast Cola",
    category: "soft-drinks",
    price: 3.99,
    rating: 4.7,
    reviewCount: 1243,
    description:
      "A crisp, refreshing cola with an icy twist. Perfectly carbonated with a hint of mint and vanilla, Arctic Blast delivers the ultimate cool-down experience.",
    ingredients: ["Carbonated Water", "Cane Sugar", "Natural Mint Extract", "Vanilla", "Caramel Color"],
    sizes: [
      { label: "Small (250ml)", price: 3.99 },
      { label: "Medium (500ml)", price: 5.49 },
      { label: "Large (750ml)", price: 6.99 },
    ],
    imageColor: "#1a6fa8",
    accentColor: "#38bdf8",
    featured: true,
    tags: ["bestseller", "new"],
  },
  {
    id: "2",
    name: "Tropical Sunrise",
    category: "juices",
    price: 5.49,
    rating: 4.8,
    reviewCount: 892,
    description:
      "A vibrant blend of mango, passion fruit, and pineapple — bursting with tropical flavor and natural vitamins. Every sip is a mini vacation.",
    ingredients: ["Mango Juice", "Passion Fruit", "Pineapple", "Lemon", "Natural Sweetener"],
    sizes: [
      { label: "Small (300ml)", price: 5.49 },
      { label: "Medium (500ml)", price: 7.49 },
    ],
    imageColor: "#c2670a",
    accentColor: "#f97316",
    featured: true,
    tags: ["popular", "healthy"],
  },
  {
    id: "3",
    name: "Thunder Rush",
    category: "energy-drinks",
    price: 4.99,
    rating: 4.5,
    reviewCount: 2341,
    description:
      "Unleash peak performance with Thunder Rush. Loaded with B-vitamins, taurine, and natural caffeine from green tea extract. No crash, all power.",
    ingredients: ["Carbonated Water", "Taurine", "Green Tea Extract", "B-Vitamins", "Natural Citrus"],
    sizes: [
      { label: "Regular (250ml)", price: 4.99 },
      { label: "Mega (500ml)", price: 7.99 },
    ],
    imageColor: "#1a4f2a",
    accentColor: "#22c55e",
    featured: true,
    tags: ["bestseller"],
  },
  {
    id: "4",
    name: "Moonlight Mojito",
    category: "cocktails",
    price: 8.99,
    rating: 4.9,
    reviewCount: 445,
    description:
      "A sophisticated non-alcoholic mojito crafted with fresh lime, hand-picked mint, and sparkling water. Elegant, refreshing, and zero proof.",
    ingredients: ["Sparkling Water", "Fresh Lime", "Mint", "Cane Sugar", "Natural Flavors"],
    sizes: [
      { label: "Regular (350ml)", price: 8.99 },
      { label: "Large (500ml)", price: 11.49 },
    ],
    imageColor: "#0d3d2e",
    accentColor: "#10b981",
    featured: false,
    tags: ["premium", "zero-proof"],
  },
  {
    id: "5",
    name: "Berry Blast Smoothie",
    category: "smoothies",
    price: 7.49,
    rating: 4.6,
    reviewCount: 678,
    description:
      "A thick, indulgent blend of strawberries, blueberries, raspberries and acai. Packed with antioxidants and natural goodness. No added sugars.",
    ingredients: ["Strawberries", "Blueberries", "Raspberries", "Acai", "Almond Milk", "Banana"],
    sizes: [
      { label: "Small (400ml)", price: 7.49 },
      { label: "Large (600ml)", price: 9.99 },
    ],
    imageColor: "#5b1fa8",
    accentColor: "#a855f7",
    featured: false,
    tags: ["healthy", "vegan"],
  },
  {
    id: "6",
    name: "Crystal Spring Water",
    category: "water",
    price: 1.99,
    rating: 4.3,
    reviewCount: 3210,
    description:
      "Pure mountain spring water from the Cascade highlands. Naturally filtered through volcanic rock for mineral-perfect hydration.",
    ingredients: ["Natural Spring Water", "Natural Minerals"],
    sizes: [
      { label: "500ml", price: 1.99 },
      { label: "1 Liter", price: 3.49 },
      { label: "1.5 Liter", price: 4.49 },
    ],
    imageColor: "#0c4a6e",
    accentColor: "#0ea5e9",
    featured: false,
    tags: ["natural", "essential"],
  },
  {
    id: "7",
    name: "Pink Lemonade Spritz",
    category: "soft-drinks",
    price: 4.49,
    rating: 4.6,
    reviewCount: 788,
    description:
      "A sparkling pink lemonade made with real raspberries and Meyer lemons. Sweet, tart, and totally irresistible.",
    ingredients: ["Sparkling Water", "Raspberry", "Meyer Lemon", "Cane Sugar", "Natural Color"],
    sizes: [
      { label: "Small (250ml)", price: 4.49 },
      { label: "Medium (500ml)", price: 6.49 },
    ],
    imageColor: "#9d174d",
    accentColor: "#f43f5e",
    featured: false,
    tags: ["popular"],
  },
  {
    id: "8",
    name: "Green Goddess Detox",
    category: "juices",
    price: 6.99,
    rating: 4.7,
    reviewCount: 521,
    description:
      "A powerful cleansing blend of cucumber, spinach, green apple, and ginger. Detoxify and energize with every bottle.",
    ingredients: ["Cucumber", "Spinach", "Green Apple", "Ginger", "Lemon", "Celery"],
    sizes: [
      { label: "350ml", price: 6.99 },
      { label: "500ml", price: 8.99 },
    ],
    imageColor: "#14532d",
    accentColor: "#4ade80",
    featured: false,
    tags: ["healthy", "detox"],
  },
  {
    id: "9",
    name: "Sunset Sangria",
    category: "cocktails",
    price: 9.49,
    rating: 4.8,
    reviewCount: 312,
    description:
      "A rich, fruity non-alcoholic sangria with notes of grape, cherry, citrus, and warm spices. Beautiful and complex.",
    ingredients: ["Grape Juice", "Cherry", "Orange", "Cinnamon", "Clove", "Sparkling Water"],
    sizes: [
      { label: "350ml", price: 9.49 },
      { label: "500ml", price: 12.99 },
    ],
    imageColor: "#7c1d1d",
    accentColor: "#dc2626",
    featured: false,
    tags: ["premium"],
  },
  {
    id: "10",
    name: "Neon Citrus Surge",
    category: "energy-drinks",
    price: 5.49,
    rating: 4.4,
    reviewCount: 1876,
    description:
      "An electrifying citrus energy drink with a neon kick. Blood orange, yuzu, and lemon amplified with natural caffeine and electrolytes.",
    ingredients: ["Blood Orange", "Yuzu", "Lemon", "Natural Caffeine", "Electrolytes", "B-Vitamins"],
    sizes: [
      { label: "Regular (250ml)", price: 5.49 },
      { label: "Mega (500ml)", price: 8.49 },
    ],
    imageColor: "#7c2d12",
    accentColor: "#fb923c",
    featured: false,
    tags: ["new"],
  },
  {
    id: "11",
    name: "Coconut Dream Smoothie",
    category: "smoothies",
    price: 8.49,
    rating: 4.9,
    reviewCount: 245,
    description:
      "Creamy coconut milk blended with banana, mango, and toasted coconut flakes. A tropical smoothie that tastes like dessert.",
    ingredients: ["Coconut Milk", "Banana", "Mango", "Toasted Coconut Flakes", "Honey"],
    sizes: [
      { label: "400ml", price: 8.49 },
      { label: "600ml", price: 10.99 },
    ],
    imageColor: "#78350f",
    accentColor: "#d97706",
    featured: false,
    tags: ["premium", "tropical"],
  },
  {
    id: "12",
    name: "Sparkling Elderflower",
    category: "soft-drinks",
    price: 4.99,
    rating: 4.5,
    reviewCount: 432,
    description:
      "A delicate, floral sparkling drink with elderflower and lychee. Light, sophisticated, and perfectly refreshing.",
    ingredients: ["Sparkling Water", "Elderflower Extract", "Lychee", "Cane Sugar", "Citric Acid"],
    sizes: [
      { label: "250ml", price: 4.99 },
      { label: "500ml", price: 7.49 },
    ],
    imageColor: "#365314",
    accentColor: "#84cc16",
    featured: false,
    tags: ["artisan"],
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
      d.description.toLowerCase().includes(lower) ||
      d.category.includes(lower) ||
      (d.tags ?? []).some((t) => t.includes(lower))
  );
};
