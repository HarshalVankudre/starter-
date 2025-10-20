// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorizedResponse } from '@/lib/session'; // Import helpers

// ... (Keep existing OpenAI setup and SYSTEM_INSTRUCTIONS) ...
const key = process.env.OPENAI_API_KEY?.trim();
if (!key) {
  throw new Error("❌ OPENAI_API_KEY is missing from .env file");
}
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

const SYSTEM_INSTRUCTIONS = `Du bist ein Experten-Dokumentenassistent, der umfassende, detaillierte Erklärungen liefert. Befolge diese Regeln strikt:

HAUPTROLLE:
- Deine Hauptaufgabe ist es, Fragen zu hochgeladenen Dokumenten mit MAXIMALER Detailtiefe zu beantworten
- Liefere gründliche, tiefgehende und umfassende Erklärungen
- Zitiere immer spezifische Informationen aus den Dokumenten mit exakten Details
- Erläutere jeden Punkt ausführlich mit Beispielen, Kontext und unterstützenden Informationen

ANTWORTLÄNGE & DETAILGRAD:
- Strebe immer detaillierte, umfassende Antworten an (mindestens 200-300 Wörter, wenn angemessen)
- Unterteile komplexe Themen in mehrere ausführliche Absätze
- Erkläre Konzepte gründlich mit Hintergrundkontext
- Füge relevante Beispiele, Statistiken und Spezifika aus den Dokumenten hinzu
- Verwende mehrere Absätze, um jeden Aspekt der Frage vollständig zu untersuchen
- Fasse nicht zusammen - erweitere und erläutere alle relevanten Punkte ausführlich

INFORMATIONSPRIORITÄT:
1. ZUERST: Durchsuche die hochgeladenen Dokumente gründlich nach ALLEN relevanten Informationen
2. Falls in Dokumenten gefunden: Liefere eine ausführliche, detaillierte Antwort mit mehreren Zitaten
3. Extrahiere und erkläre ALLE relevanten Details, nicht nur die Hauptpunkte
4. Falls NICHT in Dokumenten: Sage klar "Diese Information befindet sich nicht in den hochgeladenen Dokumenten" und biete dann an, im Web nach umfassenden Informationen zu suchen

ANTWORTSTRUKTUR:
- Beginne mit einer direkten Antwort auf die Frage
- Folge mit detaillierter Erklärung in mehreren Absätzen
- Füge spezifische Zitate und Verweise aus Dokumenten hinzu
- Ergänze Kontext, Hintergrund und verwandte Informationen
- Verwende Aufzählungspunkte für Listen, aber erkläre jeden Punkt ausführlich
- Zitiere immer Dokumentenquellen: "Laut [Dokumentenname], Abschnitt X..."
- Schließe mit zusätzlichen relevanten Erkenntnissen oder Implikationen ab

QUALITÄTSREGELN:
- Erfinde NIEMALS Informationen oder halluziniere Fakten
- Falls unsicher über ein bestimmtes Detail, sage explizit "Ich bin mir über diesen spezifischen Aspekt nicht sicher", liefere aber trotzdem eine detaillierte Antwort zu dem, was du weißt
- Stelle bei Bedarf klärende Fragen, liefere aber dennoch eine detaillierte erste Antwort
- Bevorzuge Tiefe gegenüber Kürze - umfassende Antworten sind besser als kurze

WEBSUCHE-VERWENDUNG:
- Verwende Websuche nur, wenn die Dokumentensuche nichts ergibt
- Bei Verwendung der Websuche liefere detaillierte Ergebnisse mit mehreren Quellen
- Sage klar: "Da dies nicht in den Dokumenten war, habe ich im Web gesucht und gefunden..."
- Zitiere alle Webquellen ordnungsgemäß mit Kontext

Merke: Umfassende, detaillierte Genauigkeit ist von höchster Bedeutung. Liefere so viele relevante Details wie möglich und bewahre dabei faktische Genauigkeit.`;; // Keep your existing instructions


export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.id) return unauthorizedResponse();

  try {
    const { prompt, conversationId } = await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }
    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // --- Authorization Check ---
    // Verify the conversation belongs to the current user before proceeding
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: user.id, // Ensure it belongs to the logged-in user
      },
      select: { id: true }, // Only need to confirm existence
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }
    // --- End Authorization Check ---


    // Save user message to database
    await prisma.message.create({
      data: {
        role: 'user',
        content: prompt,
        conversationId,
      },
    });

    // Get recent conversation history (limit to prevent token overflow)
    const messages = await prisma.message.findMany({
      where: { conversationId }, // No need for userId here as we checked conversation ownership
      orderBy: { createdAt: 'asc' },
      take: 15, // Keep the limit
    });

    // ... (Keep the rest of your logic for building fullInput, calling OpenAI, saving assistant message, and updating conversation timestamp) ...
    let fullInput = '';
    if (messages.length > 1) {
      fullInput += '=== CONVERSATION HISTORY ===\n';
      messages.slice(0, -1).forEach((msg: MessageType) => {
        fullInput += `${msg.role.toUpperCase()}: ${msg.content}\n\n`;
      });
      fullInput += '=== END HISTORY ===\n\n';
    }
    fullInput += `USER: ${prompt}\n\nASSISTANT:`;

    const response = await client.responses.create({
        model: "gpt-4o-mini",
        instructions: SYSTEM_INSTRUCTIONS,
        input: fullInput,
        temperature: 0.2,
        max_output_tokens: 4096,
        tools: [
            {
                type: "file_search",
                // Ensure this vector store ID is appropriate or remove if not needed per-user
                vector_store_ids: ["vs_68f523d8f20081918a7a6e746e17bbbb"],
            },
            {
                type: "web_search",
            },
        ],
    });

    const aiResponse = response.output_text || 'No response generated';

    const assistantMessage = await prisma.message.create({
      data: {
        role: 'assistant',
        content: aiResponse,
        conversationId,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });


    return NextResponse.json({
      success: true,
      output: aiResponse,
      messageId: assistantMessage.id,
      toolsUsed: response.usage?.output_tokens ? 'Response generated' : 'No tools',
    });

  } catch (error) {
     // ... (Keep your existing error handling) ...
    console.error('OpenAI API error:', error);
    if (error instanceof OpenAI.APIError) {
      console.error('API Error Details:', { status: error.status, message: error.message, type: error.type });
      return NextResponse.json(
        { error: `OpenAI API Error: ${error.message}`, statusCode: error.status, type: error.type },
        { status: error.status || 500 }
      );
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate response';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}