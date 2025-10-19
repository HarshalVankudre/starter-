// app/api/conversations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client'; // Import Prisma namespace

// Define the expected shape of the resolved params object
interface ConversationParams {
  id: string;
}

// Define the context including the params promise
interface RouteContext {
  params: Promise<ConversationParams>;
}

// GET messages for a conversation
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    if (!id) {
       return NextResponse.json({ error: 'Conversation ID is missing' }, { status: 400 });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(messages);
  } catch (error: unknown) { // Use unknown type
    console.error('Error fetching messages:', error);
    // You can add type checks here if needed, e.g., if (error instanceof Error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch messages';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE a conversation
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

     if (!id) {
       return NextResponse.json({ error: 'Conversation ID is missing' }, { status: 400 });
    }

    // Use try/catch specifically for the delete operation to handle not found
    try {
        await prisma.conversation.delete({
          where: { id },
        });
        return NextResponse.json({ success: true });
    } catch (e: unknown) { // Use unknown type
        // Check if the error is a Prisma error for record not found (P2025)
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
            return NextResponse.json(
                { error: 'Conversation not found' },
                { status: 404 }
            );
        }
        // Re-throw other errors to be caught by the outer catch
        throw e;
    }
  } catch (error: unknown) { // Use unknown type
    console.error('Error deleting conversation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete conversation';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// PATCH update conversation title
export async function PATCH(req: NextRequest, { params }: RouteContext) {
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

     // Use try/catch specifically for the update operation to handle not found
    try {
        const updatedConversation = await prisma.conversation.update({
          where: { id },
          data: { title: trimmedTitle },
        });
        return NextResponse.json(updatedConversation);
    } catch (e: unknown) { // Use unknown type
         // Check if the error is a Prisma error for record not found (P2025)
         if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
            return NextResponse.json(
                { error: 'Conversation not found' },
                { status: 404 }
            );
        }
         // Re-throw other errors
        throw e;
    }
  } catch (error: unknown) { // Use unknown type
    console.error('Error updating conversation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update conversation';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}