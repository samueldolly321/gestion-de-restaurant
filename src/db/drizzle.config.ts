import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from .env file.
dotenv.config();

// En production (Render, etc.) : DATABASE_URL (chaîne de connexion) avec SSL.
// En local : variables SQL_* du .env.
const databaseUrl = process.env.DATABASE_URL;

const config = databaseUrl
  ? defineConfig({
      schema: "./src/db/schema.ts",
      out: "./drizzle",
      dialect: "postgresql",
      schemaFilter: ["public"],
      dbCredentials: { url: databaseUrl, ssl: { rejectUnauthorized: false } },
      verbose: true,
    })
  : defineConfig({
      schema: "./src/db/schema.ts",
      out: "./drizzle", // Output directory for migrations.
      dialect: "postgresql",
      schemaFilter: ["public"],
      dbCredentials: {
        host: process.env.SQL_HOST!,
        user: process.env.SQL_ADMIN_USER!,
        password: process.env.SQL_ADMIN_PASSWORD!,
        database: process.env.SQL_DB_NAME!,
        ssl: false,
      },
      verbose: true,
    });

export default config;
