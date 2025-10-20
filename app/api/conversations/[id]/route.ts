// app/api/conversations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getCurrentUser, unauthorizedResponse } from '@/lib/session'; // Import helpers

// Define the expected shape of the resolved params object
interface ConversationParams {
  id: string;
}

// Define the context including the params promise
interface RouteContext {
  params: Promise<ConversationParams>;
}

// Helper function to check ownership
async function checkConversationOwnership(conversationId: string, userId: string): Promise<boolean> {
   const conversation = await prisma.conversation.findUnique({
     where: { id: conversationId },
     select: { userId: true },
   });
   return conversation?.userId === userId;
}


// GET messages for a specific conversation owned by the user
export async function GET(req: NextRequest, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user?.id) return unauthorizedResponse();

  try {
    const { id } = await params;
    if (!id) {
       return NextResponse.json({ error: 'Conversation ID is missing' }, { status: 400 });
    }

    // Check ownership
    const isOwner = await checkConversationOwnership(id, user.id);
    if (!isOwner) {
       return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(messages);
  } catch (error: unknown) {
    console.error('Error fetching messages:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch messages';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE a conversation owned by the user
export async function DELETE(req: NextRequest, { params }: RouteContext) {
   const user = await getCurrentUser();
   if (!user?.id) return unauthorizedResponse();

  try {
    const { id } = await params;
     if (!id) {
       return NextResponse.json({ error: 'Conversation ID is missing' }, { status: 400 });
    }

    // Check ownership before deleting
    const conversation = await prisma.conversation.findFirst({
        where: { id: id, userId: user.id },
        select: { id: true }, // Select minimal data
    });

    if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }

    // Use try/catch specifically for the delete operation
    try {
        await prisma.conversation.delete({
          where: { id }, // No need to check userId again here, we verified above
        });
        return NextResponse.json({ success: true });
    } catch (e: unknown) {
        // Handle potential errors like record not found (though unlikely after check)
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
            return NextResponse.json({ error: 'Conversation not found during delete' }, { status: 404 });
        }
        throw e; // Re-throw other errors
    }
  } catch (error: unknown) {
    console.error('Error deleting conversation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete conversation';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// PATCH update conversation title for a conversation owned by the user
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user?.id) return unauthorizedResponse();

  try {
    const { id } = await params;
    const { title } = await req.json();

     if (!id) {
       return NextResponse.json({ error: 'Conversation ID is missing' }, { status: 400 });
    }

    const trimmedTitle = title?.trim();
    if (!trimmedTitle || typeof trimmedTitle !== 'string') {
      return NextResponse.json(
        { error: 'Title is required and cannot be empty' },
        { status: 400 }
      );
    }

     // Check ownership before updating
     const conversation = await prisma.conversation.findFirst({
         where: { id: id, userId: user.id },
         select: { id: true },
     });

     if (!conversation) {
         return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
     }

    // Use try/catch specifically for the update operation
    try {
        const updatedConversation = await prisma.conversation.update({
          where: { id }, // No userId check needed here
          data: { title: trimmedTitle },
        });
        return NextResponse.json(updatedConversation);
    } catch (e: unknown) {
         if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
            return NextResponse.json({ error: 'Conversation not found during update' }, { status: 404 });
        }
        throw e;
    }
  } catch (error: unknown) {
    console.error('Error updating conversation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update conversation';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}