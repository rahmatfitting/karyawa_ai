import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { verifyPassword, hashPassword } from '@/lib/password'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'karyawan-ai-secret-key-2024',
  useSecureCookies: false,
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false,
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@karyawan.ai' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.warn('[AUTH] Missing email or password')
          return null
        }

        const email = credentials.email.trim().toLowerCase()
        console.log(`[AUTH] Attempting login for: ${email}`)

        try {
          const user = await prisma.user.findUnique({
            where: { email },
          })

          if (!user || !user.isActive) {
            console.warn(`[AUTH] User not found or inactive: ${email}`)
            return null
          }

          // Auto-bootstrap: jika password masih null di database dan user memasukkan default "admin123"
          if (!user.password) {
            if (credentials.password === 'admin123') {
              console.log(`[AUTH] Bootstrapping password for: ${email}`)
              const newHash = hashPassword('admin123')
              await prisma.user.update({
                where: { id: user.id },
                data: { password: newHash },
              })
              return {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
              }
            }
            console.warn(`[AUTH] Password not configured yet for: ${email}`)
            return null
          }

          const isValid = verifyPassword(credentials.password, user.password)
          if (!isValid) {
            console.warn(`[AUTH] Invalid password for: ${email}`)
            return null
          }

          console.log(`[AUTH] Login successful for: ${email}`)
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
          }
        } catch (error) {
          console.error('[AUTH] Exception in authorize:', error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 hari
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = (token as any).id
        (session.user as any).role = (token as any).role
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
}
