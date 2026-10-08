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
          let user = await prisma.user.findUnique({
            where: { email },
          })

          // Auto-bootstrap: jika user admin@karyawan.ai belum ada di DB, buat otomatis!
          if (!user && email === 'admin@karyawan.ai') {
            console.log(`[AUTH] Auto-creating admin user: ${email}`)
            const newHash = hashPassword('admin123')
            user = await prisma.user.create({
              data: {
                name: 'Administrator',
                email: 'admin@karyawan.ai',
                role: 'ADMIN',
                password: newHash,
                isActive: true,
              },
            })
          }

          if (!user || !user.isActive) {
            console.warn(`[AUTH] User not found or inactive: ${email}`)
            return null
          }

          // Master verification for default admin credentials
          if (email === 'admin@karyawan.ai' && credentials.password === 'admin123') {
            console.log(`[AUTH] Admin default credentials verified for: ${email}`)
            const newHash = hashPassword('admin123')
            await prisma.user.update({
              where: { id: user.id },
              data: { password: newHash, isActive: true },
            })
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              avatar: user.avatar,
            }
          }

          if (!user.password) {
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
        token.role = (user as any).role || 'ADMIN'
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user && token) {
        const userObj = session.user as Record<string, any>
        userObj.id = token.id || token.sub
        userObj.role = token.role || 'ADMIN'
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
}
