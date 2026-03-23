import { useState, useCallback } from 'react';
import { ProductCampaign } from '@prisma/client';
import { PosProduct } from '@/types/pos';
import { CartItem } from '@/components/pos/pos-client';

// Define the shape of our rules since it's stored as a JSON string
interface CampaignRules {
    buyQuantity?: number;
    getQuantity?: number;
    discountPercent?: number;
    applyTo?: 'CHEAPEST' | 'EXPENSIVE';
    target?: {
        type?: 'ALL' | 'CATEGORY' | 'BRAND' | 'PRODUCT'; // Deprecated but kept for compat
        ids?: string[]; // Deprecated
        categoryIds?: string[];
        brandIds?: string[];
        productIds?: string[];
    };
}

export interface AppliedDiscount {
    campaignId: string;
    campaignName: string;
    discountAmount: number;
    matchedItemIds: string[]; // Variant IDs that triggered/received the discount
}

export function useCampaigns(campaigns: ProductCampaign[]) {

    // Helper to parse rules safely
    const parseRules = (ruleStr: string): CampaignRules | null => {
        try {
            return JSON.parse(ruleStr);
        } catch (e) {
            return null;
        }
    };

    // Main calculation function
    const calculateDiscounts = useCallback((cart: CartItem[]): AppliedDiscount[] => {
        if (!campaigns || campaigns.length === 0 || cart.length === 0) return [];

        let appliedDiscounts: AppliedDiscount[] = [];

        campaigns.forEach(campaign => {
            if (!campaign.isActive) return;

            const rules = parseRules(campaign.rules);
            if (!rules) return;

            // 1. Filter items that match the campaign target
            const eligibleItems = cart.filter(item => {
                // If legacy type/ids exist, handle them (for backward capabilities or simple single-select)
                if (rules.target?.type === 'CATEGORY' && rules.target.ids?.length) {
                    if (!rules.target.ids.includes(item.category || "")) return false;
                }
                if (rules.target?.type === 'BRAND' && rules.target.ids?.length) {
                    if (!rules.target.ids.includes(item.brand || "")) return false;
                }

                // New flexible targeting (Intersection: Match Category AND Match Brand if defined)
                if (rules.target?.categoryIds && rules.target.categoryIds.length > 0) {
                    if (!rules.target.categoryIds.includes(item.category || "")) return false;
                }
                if (rules.target?.brandIds && rules.target.brandIds.length > 0) {
                    if (!rules.target.brandIds.includes(item.brand || "")) return false;
                }

                return true;
            });

            if (eligibleItems.length === 0) return;

            // Calculate total quantity of eligible items
            const totalEligibleQty = eligibleItems.reduce((acc, item) => acc + item.quantity, 0);

            // LOGIC FOR "Buy X Get Y" (BOGO, 3 for 2, etc.) and "Percentage Off 2nd Item"
            const buyQty = rules.buyQuantity || 0;
            const getQty = rules.getQuantity || 0;
            const discountPercent = rules.discountPercent || 0;

            if (buyQty > 0 && getQty > 0) {
                // How many times does this campaign apply?
                // Example: Buy 3 Pay 2 (Buy 2 Get 1). Cycle is 3. 
                // If I have 7 items. 7 / 3 = 2 full cycles. 
                // 2 items get 100% discount. 

                // Example: 2nd item 50% off (Buy 1 Get 1 at 50%). Cycle is 2.

                const cycleSize = buyQty + getQty;
                if (totalEligibleQty < cycleSize) return; // Not enough items

                const numberOfCycles = Math.floor(totalEligibleQty / cycleSize);
                const itemsToDiscountCount = numberOfCycles * getQty;

                // Sort eligible items to determine which ones get the discount
                // Flatten the cart items into individual units for sorting (virtual expansion)
                let expandedItems: { price: number, variantId: string }[] = [];
                eligibleItems.forEach(item => {
                    for (let i = 0; i < item.quantity; i++) {
                        expandedItems.push({ price: item.price, variantId: item.variantId });
                    }
                });

                // Sort based on rule (Cheapest or Expensive)
                // Default to Cheapest for discounts usually
                if (rules.applyTo === 'EXPENSIVE') {
                    expandedItems.sort((a, b) => b.price - a.price); // Descending
                } else {
                    expandedItems.sort((a, b) => a.price - b.price); // Ascending (Cheapest first)
                }

                // Pick the items to discount
                // Usually "Buy 1 Get 1" means the *cheapest* is free.
                // So if we sorted by Ascending, the first `itemsToDiscountCount` items are the cheapest.
                const itemsToDiscount = expandedItems.slice(0, itemsToDiscountCount);

                let totalDiscount = 0;
                const affectedIds: string[] = [];

                itemsToDiscount.forEach(item => {
                    totalDiscount += (item.price * discountPercent) / 100;
                    affectedIds.push(item.variantId);
                });

                if (totalDiscount > 0) {
                    appliedDiscounts.push({
                        campaignId: campaign.id,
                        campaignName: campaign.name,
                        discountAmount: totalDiscount,
                        matchedItemIds: [...new Set(affectedIds)]
                    });
                }
            }
            else if (rules.discountPercent && (!buyQty || buyQty === 0)) {
                // Simple percentage discount on all eligible items? 
                // Or maybe flat discount?
                // If rule is just "20% Discount" on Category X.

                let totalDiscount = 0;
                const affectedIds: string[] = [];

                eligibleItems.forEach(item => {
                    totalDiscount += (item.price * item.quantity * rules.discountPercent!) / 100;
                    affectedIds.push(item.variantId);
                });

                if (totalDiscount > 0) {
                    appliedDiscounts.push({
                        campaignId: campaign.id,
                        campaignName: campaign.name,
                        discountAmount: totalDiscount,
                        matchedItemIds: affectedIds
                    });
                }
            }

        });

        return appliedDiscounts;
    }, [campaigns]);

    return {
        calculateDiscounts
    };
}
