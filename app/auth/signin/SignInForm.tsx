// app/auth/signin/SignInForm.tsx
'use client';

import { useState, useEffect } from 'react'; // Import useEffect
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  // Use useEffect to set initial error from URL params
  useEffect(() => {
    const nextAuthError = searchParams.get('error');
    if (nextAuthError) {
      if (nextAuthError === 'CredentialsSignin') {
        setError('Invalid email or password.');
      } else {
        setError('An error occurred during sign in.');
      }
       // Optionally clear the error from the URL after displaying it
       // router.replace('/auth/signin', undefined); // Uncomment if you want to clear the URL error
    }
  }, [searchParams]); // Depend on searchParams


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Clear previous manual errors on new submit
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
         if (result.error === 'CredentialsSignin') {
            setError('Invalid email or password.');
         } else {
             setError('Sign in failed. Please try again.');
         }
      } else if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred during sign in.');
      console.error("Sign in error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-white rounded shadow-md w-full max-w-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Sign In</h1>
      {error && <p className="mb-4 text-red-500 text-center">{error}</p>}
      <form onSubmit={handleSubmit}>
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
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition disabled:opacity-50"
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
       <p className="mt-4 text-center text-sm">
          Don&apos;t have an account?{' '} {/* Remember the &apos; fix */}
          <a href="/auth/signup" className="text-blue-500 hover:underline">
            Sign Up
          </a>
        </p>
    </div>
  );
}