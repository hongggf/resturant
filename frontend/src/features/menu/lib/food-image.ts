import { assetUrl } from "@/lib/api/client"

const KNOWN_FOOD_IMAGES: Record<string, string> = {
  "diy malatang": "/food-images/diy-malatang.jpg",
  "sichuan pork dumplings": "/food-images/sichuan-dumplings.jpg",
  "sichuan pork dumplings (5pcs)": "/food-images/sichuan-dumplings.jpg",
  "kaixin world football set": "/food-images/combo-set.jpg",
  "pineapple lemon jasmine tea": "/food-images/pineapple-tea.jpg",
  "red apple jasmine tea": "/food-images/apple-tea.jpg",
  "honey lemon kiss": "/food-images/honey-lemon.jpg",
  "full steamed rice": "/food-images/full-steamed-rice.jpg",
  "half steamed rice": "/food-images/half-steamed-rice.jpg",
  "steamed rice": "/food-images/full-steamed-rice.jpg",
  "jia duo bao": "/food-images/herbal-tea.jpg",
  "chinese herbal tea": "/food-images/herbal-tea.jpg",
  "big heart lollipop": "/food-images/lollipop.jpg",
  "juicy beef ball (2pcs)": "/food-images/juicy-beef-balls.jpg",
  "fish roe meatball": "/food-images/fish-roe-meatballs.jpg",
  "mini juicy fish ball": "/food-images/mini-fish-balls.jpg",
  "usa beef": "/food-images/usa-beef.jpg",
  "tender chicken": "/food-images/tender-chicken.jpg",
  "prawn dumplings": "/food-images/prawn-dumplings.jpg",
  "mini dumplings": "/food-images/mini-dumplings.jpg",
  "kaixin dumplings": "/food-images/sichuan-dumplings.jpg",
  "deep fried tofu": "/food-images/fried-tofu.jpg",
  "fried tofu": "/food-images/fried-tofu.jpg",
  "lotus roots": "/food-images/lotus-roots.jpg",
  "needle mushroom": "/food-images/needle-mushroom.jpg",
  "crab mushroom": "/food-images/crab-mushroom.jpg",
  "broccoli": "/food-images/broccoli.jpg",
  "crab stick": "/food-images/crab-stick.jpg",
  "bacon (4pcs)": "/food-images/bacon.jpg",
  "bacon": "/food-images/bacon.jpg",
  "pork flower sausage": "/food-images/flower-sausage.jpg",
  "handmade noodles": "/food-images/handmade-noodles.jpg",
  "soft tofu": "/food-images/soft-tofu.jpg",
  "black fungus": "/food-images/black-fungus.jpg",
  "white fungus": "/food-images/white-fungus.jpg",
  "snow fungus": "/food-images/white-fungus.jpg",
  "fish cake": "/food-images/fish-cake.jpg",
  "fish roll meatball": "/food-images/fish-roll-meatball.jpg",
  "fish roll": "/food-images/fish-roll-meatball.jpg",
  "white stomach": "/food-images/white-stomach.jpg",
  "duck blood": "/food-images/duck-blood.jpg",
  "bamboo shoot": "/food-images/bamboo-shoot.jpg",
  "black chicken": "/food-images/black-chicken.jpg",
  "potato noodles": "/food-images/potato-noodles.jpg",
  "dried tofu strips": "/food-images/dried-tofu-strips.jpg",
  "mee chiet noodles": "/food-images/mee-chiet-noodles.jpg",
  "rice noodles": "/food-images/rice-noodles.jpg",
  "tang-o": "/food-images/chrysanthemum-greens.jpg",
  "chrysanthemum greens": "/food-images/chrysanthemum-greens.jpg",
  "romaine lettuce": "/food-images/romaine-lettuce.jpg",
  "cambodia water": "/food-images/cambodia-water.jpg",
  "cambodia cola": "/food-images/cambodia-cola.jpg",
  "coca-cola classic": "/food-images/coca-cola.jpg",
  "coca-cola": "/food-images/coca-cola.jpg",
  "dry malatang": "/food-images/dry-malatang.jpg",
  "sichuan spicy soup": "/food-images/sichuan-spicy-soup.jpg",
  "milky spicy soup": "/food-images/milky-spicy-soup.jpg",
  "chicken broth soup": "/food-images/chicken-broth-soup.jpg",
  "chicken broth": "/food-images/chicken-broth-soup.jpg",
  "mushroom soup": "/food-images/mushroom-soup.jpg",
  "mushroom broth": "/food-images/mushroom-soup.jpg",
}

/**
 * Resolves a displayable image URL for a food item or modifier option.
 * If a custom uploaded image exists, it resolves via assetUrl.
 * Otherwise, it matches against the known generated food images library.
 */
export function resolveItemImage(
  nameEn?: string | null,
  customImageUrl?: string | null
): string | null {
  if (customImageUrl) {
    return assetUrl(customImageUrl)
  }
  if (!nameEn) return null
  const normalized = nameEn.trim().toLowerCase()
  const exact = KNOWN_FOOD_IMAGES[normalized]
  if (exact) return exact

  for (const [key, value] of Object.entries(KNOWN_FOOD_IMAGES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value
    }
  }
  return null
}
