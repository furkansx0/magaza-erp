"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { hash } from "bcryptjs"

interface UpdateStoreState {
    success: boolean
    message: string
}

export async function updateStore(prevState: UpdateStoreState, formData: FormData): Promise<UpdateStoreState> {
    try {
        const storeId = formData.get("storeId") as string
        const name = formData.get("name") as string
        const location = formData.get("location") as string
        const username = formData.get("username") as string // This is actually email/username for login
        const password = formData.get("password") as string

        if (!storeId || !name || !username) {
            return { success: false, message: "Mağaza adı ve kullanıcı adı (e-posta) zorunludur." }
        }

        // 1. Update Store Name and Location
        await db.store.update({
            where: { id: storeId },
            data: { name, location }
        })

        // 2. Find and Update Associated User
        const storeWithUsers = await db.store.findUnique({
            where: { id: storeId },
            include: { users: true }
        })

        if (!storeWithUsers) return { success: false, message: "Mağaza bulunamadı." }

        // Find the "primary" generic POS user (CASHIER role with same name as store, or just the first CASHIER)
        let targetUser = storeWithUsers.users.find(u => u.role === "CASHIER" && u.name === storeWithUsers.name);

        if (!targetUser) {
            targetUser = storeWithUsers.users.find(u => u.role === "CASHIER");
        }

        if (password && password.trim().length > 0) {
            const hashedPassword = await hash(password, 10)

            if (targetUser) {
                await db.user.update({
                    where: { id: targetUser.id },
                    data: {
                        username: username, // Update username too
                        password: hashedPassword
                    }
                })
            } else {
                // Create new generic POS cashier user for this store
                await db.user.create({
                    data: {
                        username: username,
                        password: hashedPassword,
                        name: name, // Use store name as default user name
                        role: "CASHIER", // Default store role for POS
                        storeId: storeId
                    }
                })
            }
        } else if (targetUser && username !== targetUser.username) {
            // Only update username if changed and no password provided
            await db.user.update({
                where: { id: targetUser.id },
                data: { username: username }
            })
        }

        revalidatePath("/dashboard/stores")
        revalidatePath(`/dashboard/stores/${storeId}`)
        return { success: true, message: "Mağaza ve giriş bilgileri güncellendi." }

    } catch (error) {
        console.error("Update store error:", error)
        return { success: false, message: "Güncelleme sırasında bir hata oluştu." }
    }
}
