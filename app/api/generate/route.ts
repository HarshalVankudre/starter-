// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    const { prompt, history } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Build conversation context by combining history with current prompt
    const conversationHistory: Message[] = history || [];

    // Create a full context string including conversation history
    let fullContext = '';

    if (conversationHistory.length > 0) {
      fullContext = 'Previous conversation:\n';
      conversationHistory.forEach((msg: Message) => {
        fullContext += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
      fullContext += `\nUser: ${prompt}\nAssistant:`;
    } else {
      fullContext = prompt;
    }

    const response = await client.responses.create({
      model: "gpt-5",
      input: fullContext,
    });

    return NextResponse.json({
      success: true,
      output: response.output_text,
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