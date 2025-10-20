// lib/session.ts (create this file)
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route" // Adjust path if needed

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user
}

// Helper to return unauthorized response
import { NextResponse } from 'next/server';

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}