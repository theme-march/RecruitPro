# Manpower Recruitment Management System

A full‑stack TypeScript application built with Express, MySQL (via `mysql2/promise`), and Vite for the front‑end.

The backend exposes REST endpoints for users, agents, candidates, payments and integrates with SSLCommerz for online payment.

## 🚀 Getting Started

### Prerequisites
* Node.js 18+ (or compatible)
* A MySQL server (XAMPP, Docker, remote host, etc.)
* Optional: `npm` or `yarn` for dependency management

### Setup
1. **Clone the repository** and `cd` into it
    ```bash
    git clone <repo-url> && cd manpower-recruitment-management-system
    ```

2. **Install dependencies**
    ```bash
    npm install
    # or yarn
    ```

3. **Create a MySQL database** (example using XAMPP/phpMyAdmin):
    ```sql
    CREATE DATABASE manpower_recruitment_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    ```

4. **Configure environment variables** by copying `.env.example` to `.env` and editing values:
    ```text
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=
    DB_NAME=manpower_recruitment_db
    DB_PORT=3306

    JWT_SECRET=some_secret
    APP_URL=http://localhost:3000

    SSL_STORE_ID=your_ssl_store_id
    SSL_STORE_PASSWORD=your_ssl_password
    SSL_IS_SANDBOX=true
    SSL_IPN_URL=/api/sslcommerz/ipn
    ```

5. **Start the server**
    ```bash
    npm run dev
    # or `node server.ts` (compiled) depending on your scripts
    ```

   You should see a console message: `✅ MySQL Database connected successfully` and the API listening on port 3000.

6. **Initial seeding (optional)**
.
### Front‑end
The project uses Vite; once the server is running you can open `http://localhost:3000` in a browser. The front‑end components are in `src/pages` and `src/components`.

## 🛠 Development Notes
* All database queries use a shared `query` helper (`src/db.ts`) and a transaction wrapper.
* Authentication is JWT‑based; middleware lives in `src/middleware/auth.ts`.
* Types for database entities are in `src/types.ts`.
* API client on the front‑end: `src/services/api.ts` includes request deduplication and auth headers.

> **TypeScript tip**: with `strict` mode enabled the project needs type definitions for some dependencies.
> Run the following if you haven't already:
> ```bash
> npm install --save-dev @types/cors @types/multer @types/jsonwebtoken
> ```

## ✅ Optimization & Maintenance
* Removed legacy SQLite logic and normalized to MySQL.
* Centralized database access helpers and typed query results.
* Added role‑based authorization middleware to routes.
* Static file uploads served from `/uploads`.

## 📦 Scripts
`npm run dev` – start development server with Vite middleware.
`npm run build` – build front‑end for production (add as needed).

Happy coding! Feel free to extend or refactor further.
