import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const membro = await prisma.membroEquipe.findUnique({
          where: { email: credentials.email },
        })

        if (!membro || !membro.ativo) return null

        const senhaCorreta = await bcrypt.compare(credentials.password, membro.senha)
        if (!senhaCorreta) return null

        return {
          id: membro.id,
          email: membro.email,
          name: membro.nome,
          nivelAcesso: membro.nivelAcesso,
          cargo: membro.cargo,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.nivelAcesso = user.nivelAcesso
        token.cargo = user.cargo
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.nivelAcesso = token.nivelAcesso
        session.user.cargo = token.cargo
      }
      return session
    },
  },
}
