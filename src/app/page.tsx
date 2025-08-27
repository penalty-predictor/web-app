'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 text-center">Penalty Predictor</h1>
      <p className="text-gray-300 mb-10 text-center max-w-xl">
        Score as many penalties as you can. Your run ends after 5 saves.
      </p>
      <button
        onClick={() => router.push('/select?howto=1')}
        className="px-10 py-4 rounded-lg font-bold text-lg bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition"
      >
        Play
      </button>
    </main>
  );
}