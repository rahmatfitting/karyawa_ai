import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { verifyPassword, hashPassword } from '@/lib/password'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@karyawan.ai' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email dan password wajib diisi')
        }

        const email = credentials.email.trim().toLowerCase()
        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user || !user.isActive) {
          throw new Error('Pengguna tidak ditemukan atau akun dinonaktifkan')
        }

        // Auto-bootstrap: jika password masih null di database dan user memasukkan default "admin123"
        if (!user.password) {
          if (credentials.password === 'admin123') {
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
          throw new Error('Password belum dikonfigurasi. Gunakan password default: admin123')
        }

        const isValid = verifyPassword(credentials.password, user.password)
        if (!isValid) {
          throw new Error('Password yang dimasukkan salah')
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
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
  secret: process.env.NEXTAUTH_SECRET || 'karyawan-ai-secret-key-2024',
}
