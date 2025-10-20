// app/auth/signin/page.tsx
import React, { Suspense } from 'react';
import SignInForm from './SignInForm'; // Import the new component

// Optional: Add a simple loading fallback
function LoadingFallback() {
  return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
         <div className="p-8 bg-white rounded shadow-md w-full max-w-md text-center">
             Loading...
         </div>
      </div>
  );
}

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      {/* Wrap the client component needing searchParams in Suspense */}
      <Suspense fallback={<LoadingFallback />}>
        <SignInForm />
      </Suspense>
    </div>
  );
}