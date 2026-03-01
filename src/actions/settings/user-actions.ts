"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { hash } from "bcryptjs"
import { getSession, encrypt } from "@/lib/auth"
import { cookies } from "next/headers"

const userSchema = z.object({
    username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalı"),
    name: z.string().min(2, "Ad Soyad en az 2 karakter olmalı"),
    password: z.string().min(4, "Şifre en az 4 karakter olmalı"),
})

export async function createUser(data: z.infer<typeof userSchema>) {
    try {
        const validData = userSchema.parse(data)

        // Check duplication
        const existing = await db.user.findUnique({
            where: { username: validData.username }
        })

        if (existing) {
            return { success: false, error: "Bu kullanıcı adı zaten kullanılıyor" }
        }

        await db.user.create({
            data: {
                username: validData.username,
                name: validData.name,
                password: await hash(validData.password, 10)
            }
        })

        revalidatePath("/dashboard/users")
        revalidatePath("/dashboard/pos") // Update POS staff list too
        return { success: true }
    } catch (error) {
        return { success: false, error: "Kullanıcı oluşturulurken hata oluştu" }
    }
}


export async function createAdminUser(data: { name: string, username: string, password: string }) {
    try {
        // Check duplication
        const existing = await db.user.findUnique({
            where: { username: data.username }
        })

        if (existing) {
            return { success: false, error: "Bu kullanıcı adı zaten kullanılıyor" }
        }

        const hashedPassword = await hash(data.password, 10)

        await db.user.create({
            data: {
                username: data.username,
                name: data.name,
                password: hashedPassword,
                role: "ADMIN",
                permissions: "ALL" // Admin has all permissions
            }
        })

        return { success: true }
    } catch (error: any) {
        console.error("Create admin error:", error)
        return { success: false, error: "Hata: " + (error.message || String(error)) }
    }
}

export async function createSystemUser(data: { name: string, username: string, password: string, permissions: string[] }) {
    try {
        // Check duplication
        const existing = await db.user.findUnique({
            where: { username: data.username }
        })

        if (existing) {
            return { success: false, error: "Bu kullanıcı adı zaten kullanılıyor" }
        }

        const hashedPassword = await hash(data.password, 10)

        await db.user.create({
            data: {
                username: data.username,
                name: data.name,
                password: hashedPassword,
                role: "SYSTEM_USER", // Custom role
                permissions: JSON.stringify(data.permissions)
            }
        })

        revalidatePath("/dashboard/users")
        return { success: true }
    } catch (error: any) {
        console.error("Create system user error:", error)
        return { success: false, error: "Hata: " + (error.message || String(error)) }
    }
}

export async function deleteUser(id: string) {
    try {
        await db.user.delete({ where: { id } })
        revalidatePath("/dashboard/users")
        revalidatePath("/dashboard/pos")
        return { success: true }
    } catch (error) {
        return { success: false, error: "Silinemedi" }
    }
}

import { compare } from "bcryptjs"

export async function updateOwnProfile(data: { username: string, currentUsername?: string, currentPassword?: string, password?: string }) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Yetkisiz oturum" };

        const userId = session.userId;

        // Kullanıcı adı kontrolü
        const existing = await db.user.findUnique({
            where: { username: data.username }
        });

        if (existing && existing.id !== userId) {
            return { success: false, error: "Bu kullanıcı adı başka biri tarafından kullanılıyor." };
        }

        const currentUser = await db.user.findUnique({ where: { id: userId } });
        if (!currentUser) return { success: false, error: "Kullanıcı bulunamadı" };

        if (!data.currentUsername || data.currentUsername !== currentUser.username) {
            return { success: false, error: "Eski kullanıcı adınızı hatalı girdiniz." };
        }

        if (!data.currentPassword) {
            return { success: false, error: "İşlem yapabilmek için mevcut şifrenizi girmelisiniz." };
        }

        const isPasswordCorrect = await compare(data.currentPassword, currentUser.password);
        if (!isPasswordCorrect) {
            return { success: false, error: "Mevcut şifrenizi hatalı girdiniz." };
        }

        const updateData: any = { username: data.username };
        if (data.password && data.password.trim() !== "") {
            if (data.password.length < 4) {
                return { success: false, error: "Şifre en az 4 karakter olmalıdır." };
            }
            updateData.password = await hash(data.password, 10);
        }

        await db.user.update({
            where: { id: userId },
            data: updateData
        });

        // Yeni session yazalım ki sistemden atmasın
        session.username = data.username;
        const newSessionStr = await encrypt(session);
        const cookieStore = await cookies();
        cookieStore.set("session", newSessionStr, {
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/"
        });

        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error: any) {
        console.error("Update profile error:", error);
        return { success: false, error: "Güncelleme sırasında hata oluştu: " + error.message };
    }
}
