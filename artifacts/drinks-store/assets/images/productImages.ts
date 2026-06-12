import { apiUrl } from "@/lib/api";

const LOCAL_IMAGES: Record<string, any> = {
  "1": require("./casamigos-blanco.png"),
  "2": require("./casamigos-reposado.png"),
  "3": require("./clase-azul-anejo.png"),
  "4": require("./clase-azul-reposado.png"),
};

export function hasLocalImage(id: string): boolean {
  return Boolean(LOCAL_IMAGES[id]);
}

export function getProductImage(id: string, imageUri?: string): any {
  if (LOCAL_IMAGES[id]) return LOCAL_IMAGES[id];
  if (imageUri && imageUri.trim().length > 0) {
    const trimmed = imageUri.trim();
    // Uploaded photos are stored as a relative serving path ("/api/storage/...");
    // resolve those to an absolute URL so native Image can load them.
    const uri = trimmed.startsWith("/") ? apiUrl(trimmed) : trimmed;
    return { uri };
  }
  return LOCAL_IMAGES["1"];
}

export default LOCAL_IMAGES;
