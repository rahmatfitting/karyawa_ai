import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET || 'karyawan-ai-secret-key-2024'

  const token = await getToken({
    req,
    secret,
  })

  const { pathname } = req.nextUrl

  // Protected routes: /dashboard and its sub-paths
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // If already logged in and visiting /login, redirect to /dashboard
  if (pathname === '/login') {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
