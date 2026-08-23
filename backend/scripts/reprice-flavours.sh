#!/usr/bin/env bash
# Bring an already-seeded database in line with the free-base pricing that
# seed.sh now produces: Flavor options at $0.01, DIY Malatang's base at $0.00.
#
# seed.sh cannot do this job — it creates categories and items unconditionally,
# so re-running it against a live database duplicates the whole menu. This
# touches nothing but the prices, and option ids are echoed back so the server
# updates the existing rows instead of replacing them.
#
# Dry run by default; re-runnable, because it only writes what is already wrong.
#
#   BASE_URL=https://vongpos.com ADMIN_PASS=… ./scripts/reprice-flavours.sh
#   BASE_URL=https://vongpos.com ADMIN_PASS=… ./scripts/reprice-flavours.sh --apply
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8080}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:-Admin@123}"
FLAVOR_GROUP="${FLAVOR_GROUP:-Flavor}"
DIY_ITEM="${DIY_ITEM:-DIY Malatang}"
FLAVOR_PRICE="0.01"
DIY_PRICE="0.00"

APPLY=false
[[ "${1:-}" == "--apply" ]] && APPLY=true

say() { printf '%s\n' "$*" >&2; }

api() { # api <method> <path> [json]
    local method=$1 path=$2 body=${3:-}
    local args=(-s -X "$method" "$BASE$path" -H "Authorization: Bearer $TOKEN")
    [[ -n $body ]] && args+=(-H "Content-Type: application/json" -d "$body")
    local res
    res=$(curl "${args[@]}")
    if [[ $(jq -r '.success // false' <<<"$res") != "true" ]]; then
        say "FAILED: $method $path"
        jq . <<<"$res" >&2
        exit 1
    fi
    echo "$res"
}

# --- login -------------------------------------------------------------------

TOKEN=$(curl -s -X POST "$BASE/api/v1/auth/login" -H "Content-Type: application/json" \
    -d "$(jq -n --arg u "$ADMIN_USER" --arg p "$ADMIN_PASS" '{username: $u, password: $p}')" \
    | jq -re '.data.accessToken')
say "== $BASE — logged in as $ADMIN_USER =="
$APPLY || say "   (dry run — pass --apply to write)"
say ""

changed=0

# --- 1. flavour options ------------------------------------------------------

GROUP_ID=$(api GET "/api/v1/modifier-groups?size=200" \
    | jq -re --arg n "$FLAVOR_GROUP" '.data.content[] | select(.nameEn == $n) | .id')
GROUP=$(api GET "/api/v1/modifier-groups/$GROUP_ID" | jq '.data')

say "== $FLAVOR_GROUP =="
while read -r name price; do
    if [[ $price == "$FLAVOR_PRICE" ]]; then
        say "  = $name already \$$price"
    else
        say "  → $name  \$$price → \$$FLAVOR_PRICE"
        changed=$((changed + 1))
    fi
done < <(jq -r '.options[] | "\(.nameEn) \(.unitPrice)"' <<<"$GROUP")

if $APPLY && [[ $(jq --argjson p "$FLAVOR_PRICE" \
        '[.options[] | select(.unitPrice != $p)] | length' <<<"$GROUP") -gt 0 ]]; then
    payload=$(jq --argjson p "$FLAVOR_PRICE" '{
        nameEn, nameKm, minChoice, maxChoice, active,
        options: [.options[] | {
            id, nameEn, nameKm, imageUrl, packSize, available, sortOrder, unitPrice: $p
        }]
    }' <<<"$GROUP")
    api PUT "/api/v1/modifier-groups/$GROUP_ID" "$payload" >/dev/null
    say "  ✓ updated"
fi
say ""

# --- 2. DIY base price -------------------------------------------------------

ITEM=$(api GET "/api/v1/menu-items?size=200" \
    | jq -re --arg n "$DIY_ITEM" '.data.content[] | select(.nameEn == $n)')
ITEM_ID=$(jq -re '.id' <<<"$ITEM")
CURRENT=$(jq -r '.price' <<<"$ITEM")

say "== $DIY_ITEM =="
if [[ $CURRENT == "$DIY_PRICE" ]]; then
    say "  = base already \$$CURRENT"
else
    say "  → base  \$$CURRENT → \$$DIY_PRICE"
    changed=$((changed + 1))
    if $APPLY; then
        payload=$(jq --argjson p "$DIY_PRICE" '{
            nameEn, nameKm, descriptionEn, descriptionKm, currencyCode,
            imageUrl, available, categoryId, price: $p
        }' <<<"$ITEM")
        api PUT "/api/v1/menu-items/$ITEM_ID" "$payload" >/dev/null
        say "  ✓ updated"
    fi
fi

say ""
if [[ $changed -eq 0 ]]; then
    say "Nothing to do — pricing already matches seed.sh."
elif $APPLY; then
    say "Done: $changed price(s) updated."
else
    say "$changed price(s) would change. Re-run with --apply to write."
fi
