// app/components/PromptForm.tsx
'use client';

import { useState } from 'react';
import { ArrowUp } from 'lucide-react';

export default function PromptForm() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setResponse(data.output);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-10 p-4">
      <form
        onSubmit={handleSubmit}
        className="flex items-end bg-white border border-gray-300 rounded-2xl p-2 shadow-sm focus-within:shadow-md transition-all"
      >
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="flex-1 bg-transparent text-black placeholder-gray-400 p-3 focus:outline-none resize-none"
          rows={1}
          placeholder="Ask anything..."
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center bg-black text-white rounded-full w-8 h-8 m-2 hover:bg-gray-800 transition disabled:opacity-50"
        >
          <ArrowUp size={16} />
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          Error: {error}
        </div>
      )}

      {response && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <p className="text-gray-800 whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </div>
  );
}
