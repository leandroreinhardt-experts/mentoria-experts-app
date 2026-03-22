import 'next-auth'
import { NivelAcesso } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      nivelAcesso: NivelAcesso
      cargo?: string | null
    }
  }

  interface User {
    id: string
    nivelAcesso: NivelAcesso
    cargo?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    nivelAcesso: NivelAcesso
    cargo?: string | null
  }
}
