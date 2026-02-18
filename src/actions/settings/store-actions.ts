"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { hash } from "bcryptjs"

export async function createStore(name: string, location: string, phone: string) {
    try {
        const store = await prisma.store.create({
            data: {
                name,
                location,
                phone,
                type: "STORE"
            },
        })
        revalidatePath("/dashboard/stores")
        return { success: true, store }
    } catch (error) {
        console.error(error)
        return { success: false, error: "Mağaza oluşturulurken bir hata oluştu." }
    }
}

export async function updateStoreManager(data: {
    storeId: string
    name: string
    phone: string
    username: string
    password?: string
}) {
    try {
        // 1. Check if store exists
        const store = await prisma.store.findUnique({
            where: { id: data.storeId },
            include: { manager: true }
        })

        if (!store) return { success: false, message: "Mağaza bulunamadı." }

        // 2. Prepare User Data
        const userData: any = {
            name: data.name,
            role: "STORE_MANAGER", // Explicit Role
            username: data.username,
        }

        if (data.password && data.password.length > 0) {
            userData.password = await hash(data.password, 10)
        }

        // 3. Upsert Manager User
        if (store.manager) {
            // Update existing manager
            await prisma.user.update({
                where: { id: store.manager.id },
                data: {
                    ...userData,
                    permissions: JSON.stringify({ phone: data.phone }) // Store phone in metadata
                }
            })
        } else {
            // Create new manager
            if (!data.password) return { success: false, message: "Yeni müdür için şifre gereklidir." }

            const newUser = await prisma.user.create({
                data: {
                    ...userData,
                    password: await hash(data.password, 10),
                    storeId: data.storeId,
                    permissions: JSON.stringify({ phone: data.phone })
                }
            })

            // Link to Store
            await prisma.store.update({
                where: { id: data.storeId },
                data: { managerId: newUser.id }
            })
        }

        revalidatePath("/dashboard/stores")
        return { success: true, message: "Yönetici güncellendi." }
    } catch (error) {
        console.error(error)
        return { success: false, message: "İşlem hatası (Kullanıcı adı alınmış olabilir)." }
    }
}

export async function addStoreStaff(storeId: string, name: string) {
    try {
        // Auto-generate username from name
        // e.g. "Ahmet Yılmaz" -> "ahmetyilmaz" + random suffix if needed?
        // Let's simple format: lowercase, remove spaces.
        const baseUsername = name.toLowerCase().replace(/[^a-z0-9]/g, "")
        const randomSuffix = Math.floor(1000 + Math.random() * 9000)
        const username = `${baseUsername}${randomSuffix}`
        const password = await hash("1234", 10) // Default password

        await prisma.user.create({
            data: {
                name,
                username,
                password,
                role: "CASHIER",
                storeId
            }
        })

        revalidatePath(`/dashboard/stores/${storeId}`)
        return { success: true }
    } catch (error) {
        console.error(error)
        return { success: false, error: "Personel eklenirken hata oluştu." }
    }
}

export async function updateStoreStaff(staffId: string, name: string) {
    try {
        await prisma.user.update({
            where: { id: staffId },
            data: { name }
        })
        // Since we don't know the storeId here easily without fetching, 
        // we can revalidate the parent path generically or fetch user first.
        // Revalidating /dashboard/stores is safest or exact page.
        // Let's revalidate all stores path to be sure.
        revalidatePath("/dashboard/stores")
        return { success: true }
    } catch (error) {
        return { success: false, error: "Personel güncellenemedi." }
    }
}

export async function removeStoreStaff(staffId: string) {
    try {
        await prisma.user.update({
            where: { id: staffId },
            data: { isArchived: true }
        })
        revalidatePath("/dashboard/stores")
        return { success: true }
    } catch (error) {
        return { success: false, error: "Personel silinemedi." }
    }
}

export async function restoreStoreStaff(staffId: string) {
    try {
        await prisma.user.update({
            where: { id: staffId },
            data: { isArchived: false }
        })
        revalidatePath("/dashboard/stores")
        return { success: true }
    } catch (error) {
        return { success: false, error: "Personel geri alınamadı." }
    }
}

export async function deleteStore(storeId: string) {
    try {
        await prisma.store.delete({
            where: { id: storeId }
        })
        revalidatePath("/dashboard/stores")
        return { success: true, message: "Mağaza silindi." }
    } catch (error) {
        return { success: false, message: "Silme başarısız." }
    }
}

export async function getStoresForDeletion() {
    return await prisma.store.findMany({
        select: { id: true, name: true }
    })
}

export async function getStoreStats(storeId: string) {
    const store = await prisma.store.findUnique({
        where: { id: storeId },
        include: {
            users: {
                where: { role: "CASHIER" },
                include: {
                    sales: {
                        select: { totalAmount: true }
                    }
                }
            },
            sales: {
                select: { totalAmount: true }
            }
        }
    })

    if (!store) return null

    // Calculate aggregated stats
    const totalRevenue = store.sales.reduce((acc, sale) => acc + Number(sale.totalAmount), 0)
    const totalSalesCount = store.sales.length

    const staffStats = store.users.map(user => {
        const userTotalRevenue = user.sales.reduce((acc, sale) => acc + Number(sale.totalAmount), 0)
        const userSalesCount = user.sales.length

        return {
            id: user.id,
            name: user.name,
            username: user.username,
            totalRevenue: userTotalRevenue,
            salesCount: userSalesCount,
            // @ts-ignore
            isArchived: user.isArchived as boolean
        }
    })

    return {
        id: store.id,
        name: store.name,
        location: store.location,
        totalRevenue,
        totalSalesCount,
        staffStats
    }
}

export async function getStores() {
    try {
        const stores = await prisma.store.findMany({
            orderBy: {
                createdAt: 'desc',
            },
        })
        return stores
    } catch (error) {
        return []
    }
}
