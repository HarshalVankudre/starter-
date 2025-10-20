// app/page.tsx
import ChatInterface from './components/ChatInterface';
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await getServerSession(authOptions);

  // If no session, redirect to sign-in page
  if (!session) {
    redirect('/api/auth/signin?callbackUrl=/'); // Redirect to NextAuth's signin, will then redirect back here
  }

  // If session exists, render the chat interface
  return <ChatInterface />;
}