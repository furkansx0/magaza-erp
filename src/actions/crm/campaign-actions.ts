"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache";

export async function getCampaigns() {
    return await prisma.campaign.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            _count: {
                select: { logs: true }
            }
        }
    });
}

export async function createCampaign(data: any) {
    try {
        const campaign = await prisma.campaign.create({
            data: {
                name: data.name,
                description: data.description,
                triggerType: data.triggerType,
                triggerDate: data.triggerDate ? new Date(data.triggerDate) : null,
                targetGender: data.targetGender || "ALL",
                targetCity: data.targetCity || null,
                targetDistrict: data.targetDistrict || null,
                targetType: data.targetType || "ALL",
                giftAmount: data.giftAmount ? Number(data.giftAmount) : null,
                giftPercentage: data.giftPercentage ? Number(data.giftPercentage) : null,
                validityDays: Number(data.validityDays) || 30,
            }
        });
        revalidatePath("/dashboard/campaigns");
        return { success: true, campaign };
    } catch (error: any) {
        console.error("Create Campaign Error:", error);
        return { success: false, error: error.message };
    }
}

export async function toggleCampaign(id: string, currentState: boolean) {
    try {
        await prisma.campaign.update({
            where: { id },
            data: { isActive: !currentState }
        });
        revalidatePath("/dashboard/campaigns");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Durum değiştirilemedi" };
    }
}

export async function deleteCampaign(id: string) {
    try {
        let deletedCount = 0;
        await prisma.$transaction(async (tx) => {
            // 1. Find all logs to identify generated gift cards
            const logs = await tx.campaignLog.findMany({
                where: { campaignId: id },
                select: { giftCardId: true }
            });

            // 2. Extract Gift Card IDs (filter out nulls)
            const giftCardIds = logs
                .map(log => log.giftCardId)
                .filter((id): id is string => id !== null);

            deletedCount = giftCardIds.length;

            // 3. Delete related Gift Cards
            if (giftCardIds.length > 0) {
                await tx.giftCard.deleteMany({
                    where: { id: { in: giftCardIds } }
                });
            }

            // 4. Delete Campaign Logs
            await tx.campaignLog.deleteMany({
                where: { campaignId: id }
            });

            // 5. Finally Delete the Campaign
            await tx.campaign.delete({ where: { id } });
        });

        revalidatePath("/dashboard/campaigns");
        return { success: true, deletedCount };
    } catch (error) {
        console.error("Delete Campaign Error:", error);
        return { success: false, error: "Kampanya silinemedi." };
    }
}

export async function getCampaignStats(campaignId: string) {
    try {
        // 1. Get all Logs -> GiftCard IDs
        // Defined Count: How many customers were targeted/gifted?
        const logs = await prisma.campaignLog.findMany({
            where: { campaignId: campaignId },
            select: { giftCardId: true }
        });

        const definedCount = logs.length;

        const giftCardIds = logs
            .map(l => l.giftCardId)
            .filter((id): id is string => id !== null);

        if (giftCardIds.length === 0) {
            return {
                definedCount,
                usedCount: 0,
                totalDiscount: 0,
                netRevenue: 0
            };
        }

        // 2. Find Sales involving these gift cards
        // We need to find the specific payments made with these cards to sum "Discount"
        // And find the Sales to sum "Net Revenue"

        const campaignPayments = await prisma.salePayment.findMany({
            where: { giftCardId: { in: giftCardIds } },
            select: {
                amount: true,
                saleId: true,
                giftCardId: true // To count unique used cards
            }
        });

        // Metric: Total Discount (Kampanyadan kaynaklı indirim)
        const totalDiscount = campaignPayments.reduce((sum, p) => sum + Number(p.amount), 0);

        // Metric: Used Count (Kaç farklı çek kullanıldı)
        const uniqueUsedCards = new Set(campaignPayments.map(p => p.giftCardId)).size;

        // Metric: Net Revenue (Kasa Kazancı)
        // Find "Real Money" payments (CASH/CREDIT) for the involved sales
        const involvedSaleIds = [...new Set(campaignPayments.map(p => p.saleId))];

        let netRevenue = 0;
        if (involvedSaleIds.length > 0) {
            const realMoneyPayments = await prisma.salePayment.aggregate({
                _sum: { amount: true },
                where: {
                    saleId: { in: involvedSaleIds },
                    method: { in: ["CASH", "CREDIT_CARD"] }
                }
            });
            netRevenue = realMoneyPayments._sum.amount ? Number(realMoneyPayments._sum.amount) : 0;
        }

        return {
            definedCount,
            usedCount: uniqueUsedCards,
            totalDiscount,
            netRevenue
        };

    } catch (error) {
        console.error("Stats Error:", error);
        return { definedCount: 0, usedCount: 0, totalDiscount: 0, netRevenue: 0 };
    }
}

// --- CAMPAIGN RUNNER ENGINE ---

export async function runCampaign(campaignId: string) {
    try {
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId }
        });

        if (!campaign || !campaign.isActive) {
            return { success: false, error: "Kampanya bulunamadı veya pasif." };
        }

        // 1. Build Query Filters based on Campaign Rules
        const whereClause: any = {};

        // Gender Filter
        if (campaign.targetGender && campaign.targetGender !== "ALL") {
            whereClause.gender = campaign.targetGender;
        }

        // Customer Type Filter
        if (campaign.targetType && campaign.targetType !== "ALL") {
            whereClause.type = campaign.targetType;
        }

        // Location Filter (Exact Match for now)
        if (campaign.targetCity) {
            whereClause.city = { contains: campaign.targetCity }; // Loose match
        }
        if (campaign.targetDistrict) {
            whereClause.district = { contains: campaign.targetDistrict };
        }

        // Trigger Logic
        // For "BIRTHDAY" or "DATE", we usually run this daily via cron.
        // If running MANUALLY, maybe we ignore date? Or we strictly enforce it?
        // User wants "Otomatik tanımlıyıcaz", so let's assume this functon is called "daily"
        // OR called manually to "Apply for Today".

        if (campaign.triggerType === "BIRTHDAY") {
            // Find customers born on this Day and Month (ignore year)
            // SQLite/Prisma date filtering is tricky for "Day/Month" only.
            // We might need to fetch candidates and filter in JS if DB is limited.
            // For MVP/SQLite: Fetch all birthdays, filter in JS. Not efficient but works for small SMB.
            whereClause.birthday = { not: null };
        } else if (campaign.triggerType === "DATE") {
            // Special Date (e.g. Valentines)
            // Check if TODAY matches the Trigger Date (Day/Month match? Or specific Year?)
            // Usually "Sevgililer Günü" implies Annual. "Campaign.triggerDate" might be 2024-02-14.
            // If running manually, we might force run.
            // Let's rely on the Campaign being Active. If it's a specific date campaign,
            // we assume the user triggers it ON that date or we implement date checks.
        }

        // Fetch Candidates
        const candidates = await prisma.customer.findMany({
            where: whereClause
        });

        let processedCount = 0;
        const results = [];

        const today = new Date();

        for (const customer of candidates) {
            // JS Side Filtering for Complex Dates
            if (campaign.triggerType === "BIRTHDAY" && customer.birthday) {
                const bday = new Date(customer.birthday);
                if (bday.getDate() !== today.getDate() || bday.getMonth() !== today.getMonth()) {
                    continue; // Not today
                }
            }
            if (campaign.triggerType === "SPECIAL_DATE" && customer.specialDate) {
                const sDate = new Date(customer.specialDate);
                if (sDate.getDate() !== today.getDate() || sDate.getMonth() !== today.getMonth()) {
                    continue; // Not today
                }
            }

            // Check if already applied recently? (Prevent double gift per year?)
            // We check CampaignLog
            // For recurring events (Birthday), checks needs to be "This Year".
            // Implementation: Check Log for this campaign + Customer + CreatedAt > StartOfYear

            const startOfYear = new Date(today.getFullYear(), 0, 1);
            const existingLog = await prisma.campaignLog.findFirst({
                where: {
                    campaignId: campaign.id,
                    customerId: customer.id,
                    createdAt: { gte: startOfYear }
                }
            });

            if (existingLog) continue; // Already gifted this year

            // CREATE GIFT CARD
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + campaign.validityDays);

            // Unique Code: CMP-{ ShortUUID }
            const code = `CMP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

            const giftCard = await prisma.giftCard.create({
                data: {
                    code: code,
                    type: campaign.giftPercentage ? "PERCENTAGE" : "FIXED_AMOUNT",
                    initialAmount: campaign.giftAmount || 0,
                    remainingBalance: campaign.giftAmount || 0,
                    percentage: campaign.giftPercentage || null,
                    expiryDate: expiryDate,
                    customerId: customer.id,
                    campaignId: campaign.id
                }
            });

            // LOG IT
            await prisma.campaignLog.create({
                data: {
                    campaignId: campaign.id,
                    customerId: customer.id,
                    giftCardId: giftCard.id
                }
            });

            processedCount++;
            results.push(customer.name);
        }

        return { success: true, processedCount, results };

    } catch (error: any) {
        console.error("Run Campaign Error:", error);
        return { success: false, error: error.message };
    }
}
