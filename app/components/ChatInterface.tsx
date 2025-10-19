// app/components/ChatInterface.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowUp, Trash2, Plus, MessageSquare, Menu, X, Edit, Check, XCircle } from 'lucide-react'; // Added Edit, Check, XCircle
import ReactMarkdown from 'react-markdown';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
};

export default function ChatInterface() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null); // State for inline editing
  const [newTitle, setNewTitle] = useState(''); // State for the new title input


  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    } else {
        setMessages([]); // Clear messages if no conversation is selected
    }
  }, [currentConversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      if (!res.ok) throw new Error('Failed to fetch conversations');
      const data = await res.json();
      setConversations(data);

      // If no conversation is selected and conversations exist, select the first one
      if (!currentConversationId && data.length > 0) {
        setCurrentConversationId(data[0].id);
      } else if (data.length === 0) {
        // If there are no conversations left, clear selection
        setCurrentConversationId(null);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
      setConversations([]); // Clear conversations on error
      setCurrentConversationId(null);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      setMessages(data);
      setError(''); // Clear error on successful load
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
      setMessages([]);
    }
  };

  const createNewConversation = async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      });
      if (!res.ok) throw new Error('Failed to create conversation');
      const newConversation = await res.json();
      setConversations([newConversation, ...conversations]);
      setCurrentConversationId(newConversation.id);
      setMessages([]);
      setError('');
    } catch (err) {
      console.error('Failed to create conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to create conversation');
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete conversation');

      const remainingConversations = conversations.filter(c => c.id !== id);
      setConversations(remainingConversations);

      if (currentConversationId === id) {
        // If the deleted conversation was the current one, select the next available or none
        setCurrentConversationId(remainingConversations[0]?.id || null);
        setMessages([]);
      }
       setError('');
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete conversation');
    }
  };

 const handleRenameConversation = async (id: string, title: string) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title cannot be empty');
      // Optionally reset to original title or keep edit mode open
      // For now, just show error and keep editing:
      // setNewTitle(conversations.find(c => c.id === id)?.title || ''); // Reset input
      return;
    }
    if (trimmedTitle === conversations.find(c => c.id === id)?.title) {
        // No change, just exit edit mode
        setEditingConversationId(null);
        setError('');
        return;
    }

    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmedTitle }),
      });
      const updatedConversation = await res.json();
      if (!res.ok) throw new Error(updatedConversation.error || 'Failed to rename');

      // Update local state
      setConversations(
        conversations.map((conv) =>
          conv.id === id ? { ...conv, title: updatedConversation.title } : conv
        )
      );
      setEditingConversationId(null); // Exit editing mode
      setError('');
    } catch (err) {
      console.error('Failed to rename conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to rename conversation');
      // Keep editing mode open on error
    }
  };

  const startEditing = (conv: Conversation) => {
    setEditingConversationId(conv.id);
    setNewTitle(conv.title);
    setError(''); // Clear errors when starting edit
  };

  const cancelEditing = () => {
    setEditingConversationId(null);
    setNewTitle('');
    setError(''); // Clear errors on cancel
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !currentConversationId) return;

    const userMessage = prompt.trim(); // Use the trimmed prompt

    const optimisticMessage: Message = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: userMessage, // Use trimmed prompt
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setPrompt('');
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessage, // Send trimmed prompt
          conversationId: currentConversationId,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      // Replace optimistic message with the real one and add assistant's response
      // It's better to reload messages fully to ensure consistency
      await loadMessages(currentConversationId);
      await loadConversations(); // Refresh conversation list to update timestamps and potentially title if it was the first message
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-gray-900 text-white transition-all duration-300 flex flex-col overflow-hidden`}>
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={createNewConversation}
            className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition"
          >
            <Plus size={18} />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-center justify-between p-3 rounded-lg mb-1 cursor-pointer transition ${
                currentConversationId === conv.id ? 'bg-gray-800' : 'hover:bg-gray-800'
              } ${editingConversationId === conv.id ? 'bg-gray-700' : ''}`} // Highlight when editing
              onClick={() => {
                if (editingConversationId !== conv.id) { // Don't switch convo when clicking edit area
                  setCurrentConversationId(conv.id);
                }
              }}
            >
              {editingConversationId === conv.id ? (
                // --- Edit Mode ---
                <div className="flex-1 flex items-center gap-1">
                   <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                         e.preventDefault(); // Prevent form submission if inside a form
                         handleRenameConversation(conv.id, newTitle);
                       } else if (e.key === 'Escape') {
                         cancelEditing();
                       }
                     }}
                    className="flex-1 bg-gray-600 text-white text-sm px-2 py-1 rounded border border-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0" // Added min-w-0
                    autoFocus
                    onBlur={() => {
                        // Optional: Auto-save or cancel on blur, be careful with immediate save on blur
                        // handleRenameConversation(conv.id, newTitle); // Example: auto-save
                         setTimeout(cancelEditing, 100); // Delay cancel slightly to allow button clicks
                    }}
                  />
                  <button
                     onClick={(e) => { e.stopPropagation(); handleRenameConversation(conv.id, newTitle); }}
                     className="p-1 hover:text-green-400 flex-shrink-0" // Added flex-shrink-0
                     title="Save"
                   >
                    <Check size={16} />
                  </button>
                  <button
                     onClick={(e) => { e.stopPropagation(); cancelEditing(); }}
                     className="p-1 hover:text-red-400 flex-shrink-0" // Added flex-shrink-0
                     title="Cancel"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              ) : (
                // --- Display Mode ---
                <>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <MessageSquare size={16} className="flex-shrink-0"/>
                    <span className="text-sm truncate">{conv.title}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                     <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(conv);
                      }}
                      className="p-1 hover:bg-gray-700 rounded transition"
                      title="Rename"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                      className="p-1 hover:bg-gray-700 rounded transition"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

         {/* Optional: Show current conversation title in header */}
         <h1 className="text-lg font-semibold truncate px-4">
            {conversations.find(c => c.id === currentConversationId)?.title || 'Chat'}
          </h1>

          {/* Moved Clear Chat button to make space for title, only show if messages exist */}
          {messages.length > 0 && currentConversationId ? (
            <button
              onClick={() => currentConversationId && deleteConversation(currentConversationId)}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
              title="Delete Current Chat"
            >
              <Trash2 size={14} />
              {/* <span className="hidden sm:inline">Delete Chat</span> */}
            </button>
          ) : (
             <div className="w-10"></div> // Placeholder to keep layout consistent
           )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {!currentConversationId ? (
              <div className="text-center text-gray-400 mt-20">
                <p className="text-2xl font-semibold mb-2">No conversation selected</p>
                <p>Create a new chat or select one from the sidebar.</p>
              </div>
            ) : messages.length === 0 && !loading ? ( // Added !loading condition
              <div className="text-center text-gray-400 mt-20">
                 {/* You can customize this initial message area */}
                <p className="text-2xl font-semibold mb-2">Start chatting!</p>
                <p>Ask me anything...</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${ // Added shadow-sm
                      message.role === 'user'
                        ? 'bg-black text-white'
                        : 'bg-white border border-gray-200 text-gray-800'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                       // Improved Markdown styling for better readability
                      <div className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-gray-100 prose-pre:p-3 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-pre:my-2 prose-h1:text-xl prose-h1:font-bold prose-h1:mb-2 prose-h2:text-lg prose-h2:font-bold prose-h2:mb-2 prose-h3:text-base prose-h3:font-bold prose-h3:mb-2">
                        <ReactMarkdown
                           // Removed default components for cleaner rendering via prose styles
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex space-x-1.5"> {/* Slightly smaller spacing */}
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-3xl mx-auto w-full px-4 mb-2">
            <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg text-sm flex justify-between items-center">
              <span>Error: {error}</span>
              <button onClick={() => setError('')} className="ml-2 text-red-600 hover:text-red-800">
                 <X size={16} />
               </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={handleSubmit}
              className="flex items-end bg-white border border-gray-300 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-black transition-all" // Improved focus style
            >
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                 onKeyDown={(e) => {
                   // Submit on Enter unless Shift is pressed
                   if (e.key === 'Enter' && !e.shiftKey && !loading && currentConversationId && prompt.trim()) {
                     e.preventDefault();
                     handleSubmit(e);
                   }
                 }}
                className="flex-1 bg-transparent text-black placeholder-gray-500 p-3 focus:outline-none resize-none max-h-40" // Increased max-height
                rows={1}
                placeholder={currentConversationId ? "Ask anything..." : "Create or select a conversation"}
                disabled={loading || !currentConversationId}
              />
              <button
                type="submit"
                disabled={loading || !prompt.trim() || !currentConversationId}
                className="flex items-center justify-center bg-black text-white rounded-full w-8 h-8 m-1 hover:bg-gray-800 transition disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0" // Added flex-shrink-0
                aria-label="Send message"
              >
                <ArrowUp size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}