// app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { PrismaClient } from '@prisma/client'; // Import the base client
import bcrypt from 'bcrypt';
// Keep the import for your accelerated client if needed elsewhere, but don't use it for the adapter
// import prisma from '@/lib/prisma';

// Create a new base PrismaClient instance specifically for the adapter
const prismaClient = new PrismaClient();

export const authOptions: NextAuthOptions = {
  // Use the un-extended client for the adapter
  adapter: PrismaAdapter(prismaClient),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email", placeholder: "jsmith@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        // Use the un-extended client here as well for consistency
        const user = await prismaClient.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.password);

        if (!isValidPassword) {
          return null;
        }

        return {
           id: user.id,
           name: user.name,
           email: user.email,
           image: user.image,
        };
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
     async session({ session, token }) {
       if (token?.sub) {
          session.user = {
              ...session.user,
              id: token.sub,
          };
       }
       return session;
     },
     async jwt({ token, user }) {
         if (user?.id) {
             token.sub = user.id;
         }
         return token;
     },
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };