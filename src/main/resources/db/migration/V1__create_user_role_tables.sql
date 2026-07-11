CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users (id),
    role_id UUID NOT NULL REFERENCES roles (id),
    PRIMARY KEY (user_id, role_id)
);

INSERT INTO roles (id, name, created_at, updated_at)
VALUES
    (gen_random_uuid(), 'ADMIN', now(), now()),
    (gen_random_uuid(), 'CASHIER', now(), now());

-- Default admin user, username: admin, password: Admin@123 (change in production)
INSERT INTO users (id, username, email, password, enabled, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'admin',
    'admin@restaurant-pos.local',
    '$2a$10$1j4gPswn3n/OMVyrPxyNROBz77noldjjwOEs/KQJGvXSD3iv7Pt1u',
    TRUE,
    now(),
    now()
);

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'admin' AND r.name = 'ADMIN';
