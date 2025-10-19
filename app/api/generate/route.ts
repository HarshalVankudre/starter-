// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import prisma from '@/lib/prisma';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type MessageType = {
  id: string;
  role: string;
  content: string;
  conversationId: string;
  createdAt: Date;
};

export async function POST(req: NextRequest) {
  try {
    const { prompt, conversationId } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Save user message to database
    await prisma.message.create({
      data: {
        role: 'user',
        content: prompt,
        conversationId,
      },
    });

    // Get conversation history from database
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    // Build context from database messages
    let fullContext = '';

    if (messages.length > 1) {
      fullContext = 'Previous conversation:\n';
      messages.forEach((msg: MessageType) => {
        fullContext += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
      fullContext += '\nAssistant:';
    } else {
      fullContext = prompt;
    }

    // Get AI response
    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: fullContext,
    });

    // Save assistant message to database
    const assistantMessage = await prisma.message.create({
      data: {
        role: 'assistant',
        content: response.output_text,
        conversationId,
      },
    });

    // Update conversation's updatedAt timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      output: response.output_text,
      messageId: assistantMessage.id,
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate response';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}