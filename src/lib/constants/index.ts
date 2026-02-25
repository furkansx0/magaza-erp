/**
 * Sistem Genel Sabitleri (Scalability Layer)
 * 
 * Amaç: Projedeki hardcoded magic string'leri merkezi bir yapıdan yönetmek.
 * İleride sisteme Web (E-ticaret) modülü veya farklı dükkan tipleri eklendiğinde
 * kod içinde String aramak yerine sadece bu sabitleri genişletmek yeterli olacaktır.
 */

// Mağaza / Dükkan Tipleri
export const STORE_TYPES = {
    STORE: "STORE",
    WAREHOUSE: "WAREHOUSE",
    VIRTUAL: "VIRTUAL", // E-Ticaret depoları için
} as const;

export type StoreType = keyof typeof STORE_TYPES;


// Sipariş ve Satış Kanalları
export const CHANNELS = {
    POS: "POS",
    ONLINE: "ONLINE",
    B2B: "B2B",
} as const;

export type ChannelType = keyof typeof CHANNELS;


// Ödeme Yöntemleri
export const PAYMENT_METHODS = {
    CASH: "CASH",
    CREDIT_CARD: "CREDIT_CARD",
    BANK_TRANSFER: "BANK_TRANSFER",
    GIFT_CARD: "GIFT_CARD",
} as const;

export type PaymentMethodType = keyof typeof PAYMENT_METHODS;


// Satış ve Sipariş Durumları (Order Statuses)
export const ORDER_STATUS = {
    COMPLETED: "COMPLETED",
    PENDING: "PENDING",
    SHIPPED: "SHIPPED",
    CANCELLED: "CANCELLED",
    RETURNED: "RETURNED",
} as const;

export type OrderStatusType = keyof typeof ORDER_STATUS;


// Müşteri Tipleri
export const CUSTOMER_TYPES = {
    INDIVIDUAL: "INDIVIDUAL",
    CORPORATE: "CORPORATE",
} as const;

export type CustomerType = keyof typeof CUSTOMER_TYPES;


// Hediye Kartı Tipleri (Promosyonlar)
export const PROMO_TYPES = {
    FIXED_AMOUNT: "FIXED_AMOUNT",
    PERCENTAGE: "PERCENTAGE",
} as const;

// Stok Hareket Tipleri (Stock Movements / Ledger)
export const STOCK_MOVEMENT_TYPES = {
    SALE: "SALE",
    RETURN: "RETURN",
    TRANSFER_OUT: "TRANSFER_OUT",
    TRANSFER_IN: "TRANSFER_IN",
    ADJUSTMENT: "ADJUSTMENT",
    COUNT_CORRECTION: "COUNT_CORRECTION",
} as const;


// Cinsiyet Filtreleri
export const GENDER_TYPES = {
    MALE: "MALE",
    FEMALE: "FEMALE",
    UNISEX: "UNISEX",
    ALL: "ALL",
} as const;

// Kullanıcı Rolleri (RBAC)
export const USER_ROLES = {
    ADMIN: "ADMIN",
    STORE_MANAGER: "STORE_MANAGER",
    CASHIER: "CASHIER",
} as const;

export type UserRoleType = keyof typeof USER_ROLES;
