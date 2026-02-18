"use server"

import { prisma } from "@/lib/db"

/**
 * Generates N sequential barcodes starting using a robust SystemCounter.
 * Logic:
 * 1. Get current counter from SystemCounter (or init if missing).
 * 2. Increment and check availability in loop.
 * 3. Update counter to max used.
 */
export async function generateNextBarcodes(count: number = 1) {
    try {
        const generatedBarcodes: string[] = []

        // We use a transaction to ensure we reserve the range or update the counter safely-ish.
        await prisma.$transaction(async (tx) => {
            // 1. Get Current Counter
            let counter = await tx.systemCounter.findUnique({ where: { key: "barcode_seq" } });

            let currentVal = counter ? counter.value : 0;

            // If counter is 0, initial seed from MAX
            if (currentVal === 0) {
                const lastProduct = await tx.productVariant.findFirst({
                    where: { barcode: { startsWith: "000" } },
                    orderBy: { barcode: "desc" },
                    select: { barcode: true }
                });
                if (lastProduct && lastProduct.barcode) {
                    const numericPart = parseInt(lastProduct.barcode, 10);
                    if (!isNaN(numericPart)) currentVal = numericPart;
                }
            }

            let attempts = 0;
            const maxAttempts = count * 50; // Safety limit

            while (generatedBarcodes.length < count && attempts < maxAttempts) {
                currentVal++; // Try next number

                const candidateObj = currentVal.toString().padStart(13, "0");

                // Check collision (Manual overrides or just existing data)
                const exists = await tx.productVariant.findUnique({
                    where: { barcode: candidateObj }
                });

                if (!exists) {
                    generatedBarcodes.push(candidateObj);
                }
                // If exists, we just loop again (currentVal was incremented), skipping the busy slot.

                attempts++;
            }

            // 2. Update System Counter to the last checked value.
            // This ensures next time we start AFTER this batch, skipping the gaps we just filled/skipped.
            await tx.systemCounter.upsert({
                where: { key: "barcode_seq" },
                update: { value: currentVal },
                create: { key: "barcode_seq", value: currentVal }
            });
        }, {
            maxWait: 10000,
            timeout: 20000
        });

        if (generatedBarcodes.length < count) {
            console.warn(`Requested ${count} barcodes but could only generate ${generatedBarcodes.length}`);
            // Return what we have, or error? Better to error if partial is useless.
            if (generatedBarcodes.length === 0) throw new Error("Barkod üretilemedi (Sistem dolu veya hata).");
        }

        return { success: true, barcodes: generatedBarcodes }

    } catch (error: any) {
        console.error("Barcode Generation Error:", error)
        return { success: false, error: "Barkod üretilemedi: " + error.message }
    }
}
