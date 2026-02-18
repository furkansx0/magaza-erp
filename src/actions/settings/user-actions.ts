"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { hash } from "bcryptjs"

const userSchema = z.object({
    username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalı"),
    name: z.string().min(2, "Ad Soyad en az 2 karakter olmalı"),
    password: z.string().min(4, "Şifre en az 4 karakter olmalı"),
})

export async function createUser(data: z.infer<typeof userSchema>) {
    try {
        const validData = userSchema.parse(data)

        // Check duplication
        const existing = await prisma.user.findUnique({
            where: { username: validData.username }
        })

        if (existing) {
            return { success: false, error: "Bu kullanıcı adı zaten kullanılıyor" }
        }

        await prisma.user.create({
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
        const existing = await prisma.user.findUnique({
            where: { username: data.username }
        })

        if (existing) {
            return { success: false, error: "Bu kullanıcı adı zaten kullanılıyor" }
        }

        const hashedPassword = await hash(data.password, 10)

        await prisma.user.create({
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
        const existing = await prisma.user.findUnique({
            where: { username: data.username }
        })

        if (existing) {
            return { success: false, error: "Bu kullanıcı adı zaten kullanılıyor" }
        }

        const hashedPassword = await hash(data.password, 10)

        await prisma.user.create({
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
        await prisma.user.delete({ where: { id } })
        revalidatePath("/dashboard/users")
        revalidatePath("/dashboard/pos")
        return { success: true }
    } catch (error) {
        return { success: false, error: "Silinemedi" }
    }
}
