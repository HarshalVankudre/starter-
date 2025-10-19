// app/api/conversations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Define the expected shape of the resolved params object
interface ConversationParams {
  id: string;
}

// Define the context including the params promise
interface RouteContext {
  params: Promise<ConversationParams>;
}

// GET messages for a conversation
export async function GET(req: NextRequest, { params }: RouteContext) { // Use RouteContext
  try {
    const { id } = await params; // Await params here

    if (!id) {
       return NextResponse.json({ error: 'Conversation ID is missing' }, { status: 400 });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// DELETE a conversation
export async function DELETE(req: NextRequest, { params }: RouteContext) { // Use RouteContext
  try {
    const { id } = await params; // Await params here

     if (!id) {
       return NextResponse.json({ error: 'Conversation ID is missing' }, { status: 400 });
    }

    // Use try/catch specifically for the delete operation to handle not found
    try {
        await prisma.conversation.delete({
          where: { id },
        });
        return NextResponse.json({ success: true });
    } catch (e: any) {
        // Check if the error is due to the record not being found (P2025)
        if (e.code === 'P2025' || (e.meta && e.meta.cause === 'Record to delete does not exist.')) {
            return NextResponse.json(
                { error: 'Conversation not found' },
                { status: 404 }
            );
        }
        // Re-throw other errors
        throw e;
    }
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}

// PATCH update conversation title
export async function PATCH(req: NextRequest, { params }: RouteContext) { // Use RouteContext
  try {
    const { id } = await params; // Await params here
    const { title } = await req.json();

     if (!id) {
       return NextResponse.json({ error: 'Conversation ID is missing' }, { status: 400 });
    }

    const trimmedTitle = title?.trim(); // Optional chaining and trim
    if (!trimmedTitle || typeof trimmedTitle !== 'string') { // Check type and if empty after trim
      return NextResponse.json(
        { error: 'Title is required and cannot be empty' },
        { status: 400 }
      );
    }

     // Use try/catch specifically for the update operation to handle not found
    try {
        const updatedConversation = await prisma.conversation.update({
          where: { id },
          data: { title: trimmedTitle }, // Use trimmed title
        });
        return NextResponse.json(updatedConversation);
    } catch (e: any) {
         // Check if the error is due to the record not being found (P2025)
        if (e.code === 'P2025' || (e.meta && e.meta.cause === 'Record to update not found.')) {
            return NextResponse.json(
                { error: 'Conversation not found' },
                { status: 404 }
            );
        }
         // Re-throw other errors
        throw e;
    }
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}