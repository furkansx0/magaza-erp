import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// JWT_SECRET ortam değişkeninden okunur.
// Vercel Dashboard → Settings → Environment Variables → JWT_SECRET
// .env.local → JWT_SECRET=en-az-32-karakter-rastgele-bir-deger
const rawSecret = process.env.JWT_SECRET;
if (!rawSecret) {
    throw new Error(
        "[auth.ts] JWT_SECRET ortam değişkeni tanımlanmamış. " +
        "Vercel Dashboard veya .env.local dosyasına JWT_SECRET ekleyin."
    );
}
const key = new TextEncoder().encode(rawSecret);


export async function encrypt(payload: any) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h") // Session lasts 24 hours
        .sign(key);
}

export async function decrypt(input: string): Promise<any> {
    try {
        const { payload } = await jwtVerify(input, key, {
            algorithms: ["HS256"],
        });
        return payload;
    } catch (error) {
        return null;
    }
}

export async function getSession() {
    const session = (await cookies()).get("session")?.value;
    if (!session) return null;
    return await decrypt(session);
}

export async function updateSession(request: NextRequest) {
    const session = request.cookies.get("session")?.value;
    if (!session) return;

    // Refresh only if valid
    const parsed = await decrypt(session);
    if (!parsed) return;

    // Extend 24h
    parsed.expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const res = NextResponse.next();
    res.cookies.set({
        name: "session",
        value: await encrypt(parsed),
        httpOnly: true,
        expires: parsed.expires,
    });
    return res;
}
