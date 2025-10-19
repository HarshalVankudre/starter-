// app/components/ChatInterface.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMessage: Message = { role: 'user', content: prompt };
    setMessages((prev) => [...prev, userMessage]);
    setPrompt('');
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          history: messages, // Send conversation history for context
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.output,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-20">
              <p className="text-2xl font-semibold mb-2">Start a conversation</p>
              <p>Ask me anything...</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-black text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-3xl mx-auto w-full px-4 mb-2">
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            Error: {error}
          </div>
        </div>
      )}

      {/* Input Area - Fixed at Bottom */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="flex items-end bg-white border border-gray-300 rounded-2xl p-2 shadow-sm focus-within:shadow-md transition-all"
          >
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              className="flex-1 bg-transparent text-black placeholder-gray-400 p-3 focus:outline-none resize-none max-h-32"
              rows={1}
              placeholder="Ask anything..."
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="flex items-center justify-center bg-black text-white rounded-full w-8 h-8 m-2 hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowUp size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}