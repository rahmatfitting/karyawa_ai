import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET || 'karyawan-ai-secret-key-2024'

  // Try decoding token via NextAuth getToken
  let token = null
  try {
    token = await getToken({ req, secret })
    if (!token) {
      token = await getToken({
        req,
        secret,
        cookieName: 'next-auth.session-token',
      })
    }
    if (!token) {
      token = await getToken({
        req,
        secret,
        cookieName: '__Secure-next-auth.session-token',
      })
    }
  } catch {
    // If decryption error occurs in edge runtime, fallback to cookie check below
  }

  // Also check if valid session cookie exists
  const sessionCookie = req.cookies.get('next-auth.session-token')?.value ||
                        req.cookies.get('__Secure-next-auth.session-token')?.value

  const isAuthenticated = Boolean(token || (sessionCookie && sessionCookie.length > 20))

  const { pathname } = req.nextUrl

  // Protected routes: /dashboard and its sub-paths
  if (pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // If already logged in and visiting /login, redirect to /dashboard
  if (pathname === '/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
