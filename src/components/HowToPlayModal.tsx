import { useEffect } from 'react';

interface HowToPlayModalProps {
  open: boolean;
  onClose: () => void;
}

export function HowToPlayModal({ open, onClose }: HowToPlayModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-2xl font-extrabold">How To Play</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">×</button>
        </div>
        <div className="p-6 space-y-4 text-gray-800">
          <p><strong>Score as many penalties as you can.</strong><br/>Your run ends once the keeper makes 5 saves.</p>
          <p>Pick your country (flag will show up in your share).</p>
          <p>Aim anywhere on the goal and shoot.</p>
          <p>Each shot has one of three outcomes:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>🟩 <strong>Goal</strong> — you score.</li>
            <li>🧤 <strong>Save</strong> — the keeper stops it. Reach 5 saves and your run ends.</li>
            <li>🟥 <strong>Miss</strong> — you miss the net.</li>
          </ul>
          <p>You get 3 sessions per day. After finishing a session, tap Share to copy your result.</p>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <p className="font-semibold mb-2">Examples</p>
            <pre className="whitespace-pre-wrap text-sm">
{`⚽ Penalty Predictor 2/3 🇧🇷
🟩 🟩 🟩 🧤 🟩 🟩 🟩 🟥 🟩 🟩
🟩 🟩 🟩 🟩 🟩 🟩 🟩 🧤 🟩 🟩
🟩 🟩 🟩 🟩 🟩 🟥 🟩 🟩 🟩 🧤
🟩 🟩 🟩 🟩 🧤`}
            </pre>
            <div className="mt-3 space-y-1 text-sm">
              <p>🟩 = Goal (adds to your score)</p>
              <p>🧤 = Save (counts toward 5 that end your run)</p>
              <p>🟥 = Miss (no score, but doesn’t end your run)</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t bg-gray-50 text-right">
          <button onClick={onClose} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold">Got it</button>
        </div>
      </div>
    </div>
  );
}
