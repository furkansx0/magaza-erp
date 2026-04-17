"use server"

import { db } from "@/lib/db"

/**
 * Generates N sequential barcodes starting using a robust SystemCounter.
 * Logic:
 * 1. Get current counter from SystemCounter (or init if missing).
 * 2. Increment and check availability in loop.
 * 3. Update counter to max used.
 */
export async function generateNextBarcodes(count: number = 1) {
    try {
        const generatedBarcodes: string[] = [];

        await db.$transaction(async (tx) => {
            // 1. Get Current Counter
            let counter = await tx.systemCounter.findUnique({ where: { key: "barcode_seq" } });
            let currentVal = counter ? counter.value : 0;

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
            const maxAttempts = count * 5; // Reduced safety limit because of bulk checking

            while (generatedBarcodes.length < count && attempts < maxAttempts) {
                const candidatesToGenerate = count - generatedBarcodes.length;
                const candidateBatch = [];
                for (let i = 1; i <= candidatesToGenerate; i++) {
                    candidateBatch.push((currentVal + i).toString().padStart(13, "0"));
                }

                // Check collision in bulk
                const existing = await tx.productVariant.findMany({
                    where: { barcode: { in: candidateBatch } },
                    select: { barcode: true }
                });

                const existingSet = new Set(existing.map(e => e.barcode));

                for (let i = 0; i < candidateBatch.length; i++) {
                    const candidateObj = candidateBatch[i];
                    currentVal++; // Increment baseline
                    if (!existingSet.has(candidateObj)) {
                        generatedBarcodes.push(candidateObj);
                        if (generatedBarcodes.length === count) break;
                    }
                }
                attempts++;
            }

            // 2. Update System Counter
            await tx.systemCounter.upsert({
                where: { key: "barcode_seq" },
                update: { value: currentVal },
                create: { key: "barcode_seq", value: currentVal }
            });
        }, {
            maxWait: 15000,
            timeout: 30000
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
