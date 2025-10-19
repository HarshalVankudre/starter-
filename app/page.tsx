// app/page.tsx (App Router)
import PromptForm from './components/PromptForm';

export default function Home() {
  return (
    <main className="min-h-screen py-12">
      <h1 className="text-3xl font-bold text-center mb-8">
        AI Text Generator
      </h1>
      <PromptForm />
    </main>
  );
}