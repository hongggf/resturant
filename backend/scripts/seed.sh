#!/usr/bin/env bash
# Seed the Restaurant POS API with Kaixin Malatang test data.
# Usage: ./scripts/seed.sh  (app must be running on localhost:8080)
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8080}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:-Admin@123}"

# --- helpers -----------------------------------------------------------------

post() { # post <path> <json> -> response body (fails the script on success=false)
    local res
    res=$(curl -s -X POST "$BASE$1" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "$2")
    if [[ $(jq -r '.success' <<<"$res") != "true" ]]; then
        echo "FAILED: POST $1" >&2
        jq . <<<"$res" >&2
        exit 1
    fi
    echo "$res"
}

id_of() { jq -r '.data.id' <<<"$1"; }

# options <price> <name>... -> JSON array of ModifierOptionRequest (nameKm = nameEn)
options() {
    local price=$1; shift
    printf '%s\n' "$@" | jq -R . | jq -s --arg p "$price" \
        '[to_entries[] | {nameEn: .value, nameKm: .value, unitPrice: ($p|tonumber), available: true, sortOrder: (.key + 1)}]'
}

category() { # category <nameEn> <sortOrder> [description]
    local res
    res=$(post /api/v1/categories "$(jq -n --arg n "$1" --argjson s "$2" --arg d "${3:-}" \
        '{nameEn: $n, nameKm: $n, description: $d, sortOrder: $s, active: true}')")
    echo "  ✓ category  $1" >&2
    id_of "$res"
}

menu_item() { # menu_item <nameEn> <price> <categoryId> [descriptionEn]
    local res
    res=$(post /api/v1/menu-items "$(jq -n --arg n "$1" --arg p "$2" --arg c "$3" --arg d "${4:-}" \
        '{nameEn: $n, nameKm: $n, descriptionEn: $d, descriptionKm: $d, price: ($p|tonumber),
          currencyCode: "USD", available: true, categoryId: $c}')")
    echo "  ✓ item      $1 (\$$2)" >&2
    id_of "$res"
}

modifier_group() { # modifier_group <nameEn> <minChoice> <maxChoice> <optionsJson>
    local res
    res=$(post /api/v1/modifier-groups "$(jq -n --arg n "$1" --argjson min "$2" --argjson max "$3" --argjson o "$4" \
        '{nameEn: $n, nameKm: $n, minChoice: $min, maxChoice: $max, active: true, options: $o}')")
    echo "  ✓ group     $1 ($(jq 'length' <<<"$4") options)" >&2
    id_of "$res"
}

# --- 0. login ----------------------------------------------------------------

echo "== Login =="
TOKEN=$(curl -s -X POST "$BASE/api/v1/auth/login" -H "Content-Type: application/json" \
    -d "$(jq -n --arg u "$ADMIN_USER" --arg p "$ADMIN_PASS" '{username: $u, password: $p}')" \
    | jq -re '.data.accessToken')
echo "  ✓ logged in as $ADMIN_USER"

# --- 1. categories -----------------------------------------------------------

echo "== Categories =="
CAT_DIY=$(category "DIY Malatang" 1 "Build your own Malatang")
CAT_SIDE=$(category "Side Dishes" 2)
CAT_DRINK=$(category "Kaixin Love Drink" 3)
CAT_SOFT=$(category "I Love Soft Drinks" 4)
CAT_CANDY=$(category "I Love Candy" 5)
CAT_COMBO=$(category "Combo Set" 6)

# --- 2. modifier groups ------------------------------------------------------

echo "== Modifier groups =="
FLAVOR_OPTS='[
  {"nameEn":"Dry Malatang","nameKm":"Dry","unitPrice":0,"available":true,"sortOrder":1},
  {"nameEn":"Sichuan Spicy Soup","nameKm":"Soup","unitPrice":0,"available":true,"sortOrder":2},
  {"nameEn":"Milky Spicy Soup","nameKm":"Milk Soup","unitPrice":0,"available":true,"sortOrder":3},
  {"nameEn":"Chicken Broth Soup","nameKm":"Chicken","unitPrice":0,"available":true,"sortOrder":4},
  {"nameEn":"Mushroom Soup","nameKm":"Mushroom","unitPrice":0,"available":true,"sortOrder":5}
]'
GRP_FLAVOR=$(modifier_group "Flavor" 1 1 "$FLAVOR_OPTS")

GRP_MEAT=$(modifier_group "Meat" 0 20 "$(options 0.90 \
    "Tender Chicken" "USA Beef" "Black Chicken" "White Stomach")")

GRP_MEATBALL=$(modifier_group "Meat Ball" 0 30 "$(options 0.30 \
    "Juicy Beef Ball (2pcs)" "Mini Juicy Fish Ball" "Fish Roe Meatball" "Mini Dumplings" \
    "Kiss Hot Dog" "Crab Stick" "Crab Steak" "Duck Blood" "Potato Noodles" \
    "Beef Tendon Ball" "Kaixin Fish Ball" "Bacon (4pcs)" "Kaixin Dumplings" \
    "Pork Flower Sausage" "Fish Cake" "Prawn Dumplings" "Fish Roll Meatball")")

GRP_VEGGIE=$(modifier_group "Veggie" 0 30 "$(options 0.30 \
    "Broccoli" "White Fungus" "Black Fungus" "Soft Tofu" "Bamboo Shoot" \
    "Deep Fried Tofu" "Dried Tofu Strips" "Needle Mushroom" "Crab Mushroom" \
    "Lotus Roots" "Tang-O" "Romaine Lettuce")")

GRP_NOODLE=$(modifier_group "Noodles & Rice" 0 4 "$(options 0.70 \
    "Mee Chiet Noodles" "Handmade Noodles" "Full Steamed Rice" "Rice Noodles")")

GRP_EXTRA=$(modifier_group "Extra Love Add-Ons" 0 3 "$(options 1.58 \
    "Red Apple Jasmine Tea" "Pineapple Lemon Jasmine Tea" "Honey Lemon Kiss")")

ADDON_OPTS='[
  {"nameEn":"Full Steamed Rice","nameKm":"Full Steamed Rice","unitPrice":0.70,"available":true,"sortOrder":1},
  {"nameEn":"Half Steamed Rice","nameKm":"Half Steamed Rice","unitPrice":0.35,"available":true,"sortOrder":2},
  {"nameEn":"Sichuan Pork Dumplings (5pcs)","nameKm":"Sichuan Pork Dumplings (5pcs)","unitPrice":1.50,"available":true,"sortOrder":3}
]'
GRP_ADDON=$(modifier_group "Choice of Adds-On" 0 3 "$ADDON_OPTS")

# --- 3. menu items -----------------------------------------------------------

echo "== Menu items =="
# NOTE: API requires price > 0, so DIY Malatang uses 0.01 instead of 0.
ITEM_DIY=$(menu_item "DIY Malatang" 0.01 "$CAT_DIY" "Build your own Malatang")
menu_item "Kaixin World Football Set" 8.99 "$CAT_COMBO" "2 Signature Malatang + Dumplings + Drink" >/dev/null
menu_item "Half Steamed Rice" 0.35 "$CAT_SIDE" >/dev/null
menu_item "Full Steamed Rice" 0.70 "$CAT_SIDE" >/dev/null
menu_item "Sichuan Pork Dumplings" 1.50 "$CAT_SIDE" >/dev/null
menu_item "Pineapple Lemon Jasmine Tea" 1.98 "$CAT_DRINK" >/dev/null
menu_item "Red Apple Jasmine Tea" 1.98 "$CAT_DRINK" >/dev/null
menu_item "Honey Lemon Kiss" 1.98 "$CAT_DRINK" >/dev/null
menu_item "Cambodia Water" 1.00 "$CAT_SOFT" >/dev/null
menu_item "Cambodia Cola" 1.00 "$CAT_SOFT" >/dev/null
menu_item "Coca-Cola Classic" 1.00 "$CAT_SOFT" >/dev/null
menu_item "Jia Duo Bao" 1.20 "$CAT_SOFT" >/dev/null
menu_item "Big Heart Lollipop" 1.00 "$CAT_CANDY" >/dev/null

# --- 4. attach modifier groups to DIY Malatang -------------------------------

echo "== Attach modifier groups to DIY Malatang =="
i=0
for grp in "$GRP_FLAVOR" "$GRP_MEAT" "$GRP_MEATBALL" "$GRP_VEGGIE" "$GRP_NOODLE" "$GRP_EXTRA" "$GRP_ADDON"; do
    post "/api/v1/menu-items/$ITEM_DIY/modifier-groups" \
        "$(jq -n --arg g "$grp" --argjson s "$i" '{modifierGroupId: $g, sortOrder: $s}')" >/dev/null
    echo "  ✓ attached  sortOrder=$i groupId=$grp"
    i=$((i + 1))
done

# --- 5. tables ----------------------------------------------------------------

echo "== Tables =="
for t in T-01 T-02 T-03; do
    post /api/v1/tables "$(jq -n --arg n "$t" '{tableNumber: $n}')" >/dev/null
    echo "  ✓ table     $t"
done

echo
echo "Seed complete."
