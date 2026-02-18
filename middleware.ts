import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth'

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname

    // Define protected routes
    const isProtectedRoute = path.startsWith('/dashboard') || path.startsWith('/pos')

    // Get session from cookie
    const cookie = request.cookies.get('session')?.value
    const session = cookie ? await decrypt(cookie) : null

    // Redirect to login if accessing protected route without session
    if (isProtectedRoute && !session) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Redirect to dashboard if accessing login while authenticated
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
