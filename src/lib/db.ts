import { PrismaClient } from "@prisma/client";

// Global singleton pattern - prevents connection pool exhaustion in serverless
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

function createPrismaClient() {
    const connectionString = process.env.DATABASE_URL!;

    // Neon connection pooling: ensure pgbouncer=true is set for transaction mode.
    // This allows PgBouncer to reuse connections across serverless invocations.
    // If DATABASE_URL already contains pgbouncer=true it stays as-is.
    // If not, we add it here to enforce serverless-safe pooling.
    const pooledUrl = connectionString.includes("pgbouncer=true")
        ? connectionString
        : `${connectionString}${connectionString.includes("?") ? "&" : "?"}pgbouncer=true`;

    return new PrismaClient({
        datasourceUrl: pooledUrl,
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
}