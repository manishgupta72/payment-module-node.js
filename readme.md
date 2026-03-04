# Payment System API

A RESTful backend API for a payment system built with Node.js, Express, and PostgreSQL. Supports user authentication with JWT access/refresh tokens, session management, and a relational schema for orders and payments.

---

## Tech Stack

| Layer      | Technology                        |
| ---------- | --------------------------------- |
| Runtime    | Node.js                           |
| Framework  | Express v5                        |
| Database   | PostgreSQL (via `pg`)             |
| Auth       | JWT (`jsonwebtoken`) + bcrypt     |
| Validation | Zod                               |
| Session    | HTTP-only cookies + refresh token |
| Dev Server | Nodemon                           |

---

## Features

- User registration with hashed passwords
- Login with JWT access token + refresh token (stored in HTTP-only cookie)
- Refresh token rotation with session tracking
- Secure logout with session revocation
- PostgreSQL schema with UUIDs, constraints, and indexes

---

## Project Structure

```
payment_system/
├── config/
│   └── db.js               # PostgreSQL connection pool
├── controller/
│   └── user.controller.js  # Route handlers
├── routes/
│   └── user.routes.js      # Express router
├── service/
│   └── auth.service.js     # Auth business logic
├── validation/
│   └── user.validation.js  # Zod schemas
├── index.js                # App entry point
└── .env                    # Environment variables (not committed)
```

---

## API Endpoints

Base URL: `http://localhost:4000`

| Method | Endpoint             | Description                     | Auth Required |
| ------ | -------------------- | ------------------------------- | ------------- |
| POST   | `/api/users`         | Register a new user             | No            |
| POST   | `/api/users/login`   | Login and receive tokens        | No            |
| POST   | `/api/users/refresh` | Refresh access token via cookie | Cookie        |
| GET    | `/api/users/logout`  | Logout and revoke session       | Cookie        |

---

## Database Schema

### users

```sql
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      VARCHAR(255) UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  role       VARCHAR(20) NOT NULL CHECK (role IN ('USER', 'ADMIN')),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### orders

```sql
CREATE TABLE orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  status       VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','PAID','FAILED','REFUNDED')),
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### payments

```sql
CREATE TABLE payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  gateway_payment_id VARCHAR(255) NOT NULL UNIQUE,
  amount             NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  status             VARCHAR(20) NOT NULL CHECK (status IN ('INITIATED','SUCCESS','FAILED','REFUNDED')),
  raw_response       JSONB,
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### sessions

```sql
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,
  expires_at    TIMESTAMP WITH TIME ZONE NOT NULL,
  user_agent    TEXT,
  ip_address    TEXT,
  device_name   TEXT,
  is_revoked    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at    TIMESTAMP
);

CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
```

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd payment_system
npm install
```

### 2. Configure environment

Create a `.env` file in the root:

```env
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/payment_db
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### 3. Set up the database

Run the SQL scripts above in your PostgreSQL database in order:

1. `users`
2. `orders`
3. `payments`
4. `sessions`

### 4. Run the server

```bash
npm start
```

Server starts at `http://localhost:4000`

---

## Author

**Manish**
