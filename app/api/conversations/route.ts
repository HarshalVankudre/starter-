// app/api/conversations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorizedResponse } from '@/lib/session'; // Import helpers

// GET user's conversations
export async function GET() {
  const user = await getCurrentUser();
  if (!user?.id) return unauthorizedResponse();

  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: user.id }, // Filter by userId
      orderBy: { updatedAt: 'desc' },
      // Removed message include for brevity, fetch messages separately if needed
      // include: {
      //   messages: {
      //     take: 1,
      //     orderBy: { createdAt: 'desc' },
      //   },
      // },
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// POST create new conversation for the user
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.id) return unauthorizedResponse();

  try {
    const { title } = await req.json();

    const conversation = await prisma.conversation.create({
      data: {
        title: title || 'New Chat',
        userId: user.id, // Associate with the logged-in user
      },
    });

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}