"use server"

import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function createAuditLog(data: {
    action: string,
    entity: string,
    entityId?: string,
    details?: string
    // userId is derived from session for security
}) {
    try {
        const session = await getSession();
        if (!session || !session.userId) {
            console.warn("Audit Log Attempt without User:", data);
            return; // Can't log user action if no user
        }

        console.log("Attempting to write audit log:", data.action, data.entity);
        await prisma.auditLog.create({
            data: {
                userId: session.userId,
                action: data.action,
                entity: data.entity,
                entityId: data.entityId,
                details: data.details
            }
        });
        console.log("Audit log written successfully.");
    } catch (error) {
        console.error("Failed to create audit log (Prisma Error Likely):", error);
        // Don't throw, as logging failure shouldn't block main action
    }
}

export async function getAuditLogs(entity?: string, entityId?: string, limit = 50) {
    try {
        const whereClause: any = {};
        if (entity) whereClause.entity = entity;
        if (entityId) whereClause.entityId = entityId;

        return await prisma.auditLog.findMany({
            where: whereClause,
            include: {
                user: {
                    select: { name: true, username: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: limit
        });
    } catch (error) {
        console.error("Failed to fetch audit logs:", error);
        return [];
    }
}
