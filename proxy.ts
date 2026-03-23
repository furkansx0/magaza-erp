import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth'

export default async function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname

    // Exclude public assets and API routes (except specific ones if needed)
    if (
        path.startsWith("/_next") ||
        path.startsWith("/api") ||
        path.endsWith(".ico") ||
        path.endsWith(".png") ||
        path.endsWith(".jpg")
    ) {
        return NextResponse.next()
    }

    // 1. Installation Check
    const isInstalledCookie = request.cookies.get("is_installed")
    const isInstalled = isInstalledCookie?.value === "true"

    if (!isInstalled) {
        if (path.startsWith("/install")) {
            return NextResponse.next()
        }
        return NextResponse.redirect(new URL("/install", request.url))
    }

    if (isInstalled && path.startsWith("/install")) {
        return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    // 2. Auth Check
    const isProtectedRoute = path.startsWith('/dashboard') || path.startsWith('/pos')
    const cookie = request.cookies.get('session')?.value
    const session = cookie ? await decrypt(cookie) : null

    if (isProtectedRoute && !session) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (path === '/login' && session) {
        if (session.role === 'STORE_MANAGER' && session.storeId) {
            return NextResponse.redirect(new URL(`/dashboard/stores/${session.storeId}`, request.url))
        }
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/dashboard/:path*', '/pos/:path*', '/login'],
}
