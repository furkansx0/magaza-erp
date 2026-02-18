"use server"

import { prisma } from "@/lib/db"
import { compare } from "bcryptjs"
import { cookies } from "next/headers"
import { encrypt } from "@/lib/auth"
import { redirect } from "next/navigation"

export async function login(formData: FormData) {
    const username = formData.get("username") as string
    const password = formData.get("password") as string

    if (!username || !password) {
        return { success: false, message: "Kullanıcı adı ve şifre gereklidir." }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { username }
        })

        if (!user) {
            return { success: false, message: "Kullanıcı bulunamadı." }
        }

        const passwordMatch = await compare(password, user.password)

        if (!passwordMatch) {
            return { success: false, message: "Şifre hatalı." }
        }

        // Create Session
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        const session = await encrypt({
            userId: user.id,
            username: user.username,
            role: user.role, // ADMIN or CASHIER or SYSTEM_USER
            permissions: user.permissions,
            storeId: user.storeId
        })

        const cookieStore = await cookies()
        cookieStore.set("session", session, {
            expires,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/"
        })

        // Determine Redirect URL
        // Determine Redirect URL
        // Determine Redirect URL
        let redirectUrl = "/pos"

        if (user.role === "ADMIN" || user.role === "SYSTEM_USER") {
            redirectUrl = "/dashboard"
        } else if (user.role === "STORE_MANAGER" && user.storeId) {
            redirectUrl = `/dashboard/stores/${user.storeId}`
        }

        return { success: true, redirectUrl }

    } catch (error) {
        console.error("Login error details:", error)
        return { success: false, message: `Giriş hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}` }
    }
}

export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete("session")
    redirect("/login")
}
