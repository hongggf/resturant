package com.vichovong.restaurant_pos.security;

import java.util.UUID;

/**
 * Authenticated principal for QR-table guests. Carries only the table-session id —
 * guests have no user account; the session id always comes from the token, never the URL.
 */
public record GuestPrincipal(UUID sessionId) {
}
