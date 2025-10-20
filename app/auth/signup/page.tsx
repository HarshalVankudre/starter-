// app/auth/signup/page.tsx
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', { // We need to create this API route
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to register');
      }

      // Automatically sign in after successful registration
      const signInResult = await signIn('credentials', {
        redirect: false, // Don't redirect automatically, handle it manually
        email,
        password,
      });

      if (signInResult?.error) {
         setError('Registration successful, but failed to sign in automatically. Please sign in manually.');
         // Redirect to sign-in page or show login form again
         router.push('/auth/signin');
      } else if (signInResult?.ok) {
        router.push('/'); // Redirect to home page after successful sign in
        router.refresh(); // Refresh page to update session state everywhere
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign Up</h1>
        {error && <p className="mb-4 text-red-500 text-center">{error}</p>}
        <form onSubmit={handleSubmit}>
           <div className="mb-4">
             <label className="block text-gray-700 mb-2" htmlFor="name">
               Name (Optional)
             </label>
             <input
               type="text"
               id="name"
               value={name}
               onChange={(e) => setName(e.target.value)}
               className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
             />
           </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 mb-2" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6} // Add a minimum password length requirement
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition disabled:opacity-50"
          >
            {loading ? 'Signing Up...' : 'Sign Up'}
          </button>
        </form>
         <p className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <a href="/auth/signin" className="text-blue-500 hover:underline">
              Sign In
            </a>
          </p>
      </div>
    </div>
  );
}