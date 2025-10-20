// app/components/ChatInterface.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react'; // Import useSession and signOut
import { ArrowUp, Trash2, Plus, MessageSquare, Menu, X, Edit, Check, XCircle, LogOut } from 'lucide-react'; // Added LogOut
import ReactMarkdown from 'react-markdown';

// ... (Keep existing Type definitions: Message, Conversation) ...
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


// Add User type from session
type User = {
    id: string;
    name?: string | null | undefined;
    email?: string | null | undefined;
    image?: string | null | undefined;
}

// Extend session type to include user with id
interface ExtendedSession {
    user?: User & { id: string }; // Ensure user has an id
    expires: string;
}


export default function ChatInterface() {
  const { data: session, status } = useSession() as { data: ExtendedSession | null, status: 'loading' | 'authenticated' | 'unauthenticated' }; // Get session data and status
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');


  // Load conversations only when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      loadConversations();
    } else if (status === 'unauthenticated') {
        // Clear state if user logs out
        setConversations([]);
        setCurrentConversationId(null);
        setMessages([]);
        setError('');
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]); // Dependency on session status

  // --- Keep loadMessages, useEffect for currentConversationId, useEffect for messagesEndRef ---
   // Load messages when conversation changes
   useEffect(() => {
    if (currentConversationId && status === 'authenticated') {
      loadMessages(currentConversationId);
    } else {
        setMessages([]); // Clear messages if no conversation or not authenticated
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversationId, status]);

   // Auto-scroll to bottom
   useEffect(() => {
     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
   }, [messages]);


  // --- Keep loadConversations, createNewConversation, deleteConversation, handleRenameConversation, startEditing, cancelEditing ---
  // (These functions implicitly use the authenticated user via the API calls)
   const loadConversations = async () => {
     // Check status again inside async function
     if (status !== 'authenticated') return;
    try {
      const res = await fetch('/api/conversations'); // API is protected
      if (!res.ok) throw new Error('Failed to fetch conversations');
      const data = await res.json();
      setConversations(data);

      if (!currentConversationId && data.length > 0) {
        setCurrentConversationId(data[0].id);
      } else if (data.length === 0) {
        setCurrentConversationId(null);
      }
      setError(''); // Clear error on successful load
    } catch (err) {
      console.error('Failed to load conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
      setConversations([]);
      setCurrentConversationId(null);
    }
  };

  const loadMessages = async (conversationId: string) => {
     if (status !== 'authenticated') return;
    try {
      const res = await fetch(`/api/conversations/${conversationId}`); // API is protected
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      setMessages(data);
      setError('');
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
      setMessages([]);
    }
  };

  const createNewConversation = async () => {
    if (status !== 'authenticated') return;
    try {
      const res = await fetch('/api/conversations', { // API is protected
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }), // API associates with user
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
     if (status !== 'authenticated') return;
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' }); // API is protected
      if (!res.ok) throw new Error('Failed to delete conversation');

      const remainingConversations = conversations.filter(c => c.id !== id);
      setConversations(remainingConversations);

      if (currentConversationId === id) {
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
     if (status !== 'authenticated') return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title cannot be empty');
      return;
    }
    if (trimmedTitle === conversations.find(c => c.id === id)?.title) {
        setEditingConversationId(null);
        setError('');
        return;
    }

    try {
      const res = await fetch(`/api/conversations/${id}`, { // API is protected
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmedTitle }),
      });
      const updatedConversation = await res.json();
      if (!res.ok) throw new Error(updatedConversation.error || 'Failed to rename');

      setConversations(
        conversations.map((conv) =>
          conv.id === id ? { ...conv, title: updatedConversation.title } : conv
        )
      );
      setEditingConversationId(null);
      setError('');
    } catch (err) {
      console.error('Failed to rename conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to rename conversation');
    }
  };

  const startEditing = (conv: Conversation) => {
    setEditingConversationId(conv.id);
    setNewTitle(conv.title);
    setError('');
  };

  const cancelEditing = () => {
    setEditingConversationId(null);
    setNewTitle('');
    setError('');
  };


   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!prompt.trim() || !currentConversationId || status !== 'authenticated') return; // Check status

     const userMessage = prompt.trim();

     const optimisticMessage: Message = {
       id: 'temp-' + Date.now(),
       role: 'user',
       content: userMessage,
       createdAt: new Date().toISOString(),
     };

     setMessages(prev => [...prev, optimisticMessage]);
     setPrompt('');
     setLoading(true);
     setError('');

     try {
       const res = await fetch('/api/generate', { // API is protected
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           prompt: userMessage,
           conversationId: currentConversationId, // API checks ownership
         }),
       });

       const data = await res.json();
       if (!res.ok) throw new Error(data.error || 'Something went wrong');

       // Reload messages and conversations
       await loadMessages(currentConversationId);
       await loadConversations();
     } catch (err) {
       setError(err instanceof Error ? err.message : 'An unexpected error occurred');
       setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
     } finally {
       setLoading(false);
     }
   };

    // Show loading state while session is being determined
    if (status === 'loading') {
      return <div className="flex justify-center items-center h-screen">Loading session...</div>;
    }

    // If unauthenticated, you might show a different UI or rely on the page redirect
    // This component assumes it's rendered only for authenticated users due to the page protection
    // However, adding a check here can be a fallback
    if (status === 'unauthenticated') {
       // This shouldn't be reached if page.tsx redirects correctly
       return <div className="flex justify-center items-center h-screen">Redirecting to sign in...</div>;
    }


  // --- Render logic remains largely the same, but add Sign Out button ---
   return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-gray-900 text-white transition-all duration-300 flex flex-col overflow-hidden`}>
        {/* New Chat Button */}
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={createNewConversation}
            disabled={loading} // Disable if a message is being generated
            className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            <Plus size={18} />
            New Chat
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((conv) => (
             <div
              key={conv.id}
              className={`group flex items-center justify-between p-3 rounded-lg mb-1 cursor-pointer transition ${
                currentConversationId === conv.id ? 'bg-gray-800' : 'hover:bg-gray-800'
              } ${editingConversationId === conv.id ? 'bg-gray-700' : ''}`}
              onClick={() => {
                if (editingConversationId !== conv.id) {
                  setCurrentConversationId(conv.id);
                }
              }}
            >
              {editingConversationId === conv.id ? (
                // Edit Mode
                <div className="flex-1 flex items-center gap-1">
                   <input /* ...input props... */
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') { e.preventDefault(); handleRenameConversation(conv.id, newTitle); }
                       else if (e.key === 'Escape') { cancelEditing(); }
                     }}
                    className="flex-1 bg-gray-600 text-white text-sm px-2 py-1 rounded border border-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
                    autoFocus
                    onBlur={() => setTimeout(cancelEditing, 100)} // Use timeout to allow button clicks
                  />
                  <button onClick={(e) => { e.stopPropagation(); handleRenameConversation(conv.id, newTitle); }} className="p-1 hover:text-green-400 flex-shrink-0" title="Save"> <Check size={16} /> </button>
                  <button onClick={(e) => { e.stopPropagation(); cancelEditing(); }} className="p-1 hover:text-red-400 flex-shrink-0" title="Cancel"> <XCircle size={16} /> </button>
                </div>
              ) : (
                // Display Mode
                <>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <MessageSquare size={16} className="flex-shrink-0"/>
                    <span className="text-sm truncate">{conv.title}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                     <button onClick={(e) => { e.stopPropagation(); startEditing(conv); }} className="p-1 hover:bg-gray-700 rounded transition" title="Rename"> <Edit size={14} /> </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }} className="p-1 hover:bg-gray-700 rounded transition" title="Delete"> <Trash2 size={14} /> </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Sign Out Button */}
         <div className="p-4 border-t border-gray-700 mt-auto">
           <div className="text-xs text-gray-400 mb-2 truncate" title={session?.user?.email ?? ''}>
             {session?.user?.email}
           </div>
           <button
             onClick={() => signOut({ callbackUrl: '/auth/signin' })} // Redirect to signin after signout
             className="w-full flex items-center justify-center gap-2 bg-red-800 hover:bg-red-700 px-4 py-2 rounded-lg transition text-sm"
           >
             <LogOut size={16} />
             Sign Out
           </button>
         </div>

      </div>

      {/* Main Chat Area */}
      {/* --- Keep the rest of the Main Chat Area JSX the same --- */}
       <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg transition"> {sidebarOpen ? <X size={20} /> : <Menu size={20} />} </button>
         <h1 className="text-lg font-semibold truncate px-4"> {conversations.find(c => c.id === currentConversationId)?.title || 'Chat'} </h1>
          {messages.length > 0 && currentConversationId ? ( <button onClick={() => currentConversationId && deleteConversation(currentConversationId)} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50" title="Delete Current Chat"> <Trash2 size={14} /> </button> ) : ( <div className="w-10"></div> )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {!currentConversationId ? ( <div className="text-center text-gray-400 mt-20"> <p className="text-2xl font-semibold mb-2">No conversation selected</p> <p>Create a new chat or select one.</p> </div>
            ) : messages.length === 0 && !loading ? ( <div className="text-center text-gray-400 mt-20"> <p className="text-2xl font-semibold mb-2">Start chatting!</p> <p>Ask me anything...</p> </div>
            ) : ( messages.map((message) => ( <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}> <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${ message.role === 'user' ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-800' }`}> {message.role === 'assistant' ? ( <div className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-gray-100 prose-pre:p-3 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-pre:my-2"> <ReactMarkdown>{message.content}</ReactMarkdown> </div> ) : ( <p className="whitespace-pre-wrap">{message.content}</p> )} </div> </div> ))
            )}
            {loading && ( <div className="flex justify-start"> <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm"> <div className="flex space-x-1.5"> <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div> <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div> <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div> </div> </div> </div> )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Error */}
        {error && ( <div className="max-w-3xl mx-auto w-full px-4 mb-2"> <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg text-sm flex justify-between items-center"> <span>Error: {error}</span> <button onClick={() => setError('')} className="ml-2 text-red-600 hover:text-red-800"> <X size={16} /> </button> </div> </div> )}

        {/* Input */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="flex items-end bg-white border border-gray-300 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-black transition-all">
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !loading && currentConversationId && prompt.trim()) { e.preventDefault(); handleSubmit(e); } }} className="flex-1 bg-transparent text-black placeholder-gray-500 p-3 focus:outline-none resize-none max-h-40" rows={1} placeholder={currentConversationId ? "Ask anything..." : "Select a conversation"} disabled={loading || !currentConversationId} />
              <button type="submit" disabled={loading || !prompt.trim() || !currentConversationId} className="flex items-center justify-center bg-black text-white rounded-full w-8 h-8 m-1 hover:bg-gray-800 transition disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0" aria-label="Send message"> <ArrowUp size={16} /> </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}