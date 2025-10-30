import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon } from './icons';

interface ApiKeyManagerProps {
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
  tokensUsed: number;
  tokenLimit: number;
}

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ apiKey, setApiKey, tokensUsed, tokenLimit }) => {
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleSaveKey = () => {
    if (keyInput.trim()) {
      setApiKey(keyInput.trim());
      setKeyInput('');
    }
  };

  const handleClearKey = () => {
    setApiKey(null);
  };

  if (!apiKey) {
    return (
      <div className="mb-6 bg-yellow-100/10 border border-yellow-400/50 text-yellow-200 px-4 py-4 rounded-lg shadow-lg">
        <h3 className="font-bold text-lg mb-2">API Kulcs szükséges</h3>
        <p className="text-sm mb-4">
          A képszerkesztéshez meg kell adnia a Google AI Studio API kulcsát. A kulcsot ingyenesen létrehozhatja{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-primary hover:underline"
          >
            ezen a linken
          </a>
          . A kulcsot a böngészője biztonságosan tárolja.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-grow">
                <input
                    type={showKey ? 'text' : 'password'}
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="Illessze be az API kulcsot"
                    className="w-full bg-base-300 text-text-primary border border-base-300 rounded-lg py-2 pl-3 pr-10 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition"
                />
                <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-text-secondary hover:text-text-primary"
                    aria-label={showKey ? "Hide API key" : "Show API key"}
                >
                    {showKey ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
            </div>
            <button
                onClick={handleSaveKey}
                disabled={!keyInput.trim()}
                className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-secondary transition-all disabled:bg-base-300 disabled:text-text-secondary/50 disabled:cursor-not-allowed"
            >
                Mentés
            </button>
        </div>
      </div>
    );
  }

  const percentageUsed = tokenLimit > 0 ? (tokensUsed / tokenLimit) * 100 : 0;
  
  return (
    <div className="mb-6 bg-base-200 p-4 rounded-lg shadow">
        <div className="flex justify-between items-center text-sm mb-2">
            <div className="flex items-center gap-2">
                 <span className="font-semibold text-text-primary">API Kulcs Beállítva</span>
                 <span className="text-green-400 text-xs py-0.5 px-1.5 bg-green-500/10 rounded-full">✓ Aktív</span>
            </div>
            <button onClick={handleClearKey} className="text-sm text-brand-primary hover:text-brand-secondary font-semibold">
                Módosítás
            </button>
        </div>
        <div className="flex justify-between items-center mb-2 text-sm mt-4">
            <span className="font-semibold text-text-primary">Napi Token Felhasználás</span>
            <span className="text-text-secondary">{tokensUsed.toLocaleString()} / {tokenLimit.toLocaleString()}</span>
        </div>
        <div className="w-full bg-base-300 rounded-full h-2.5">
            <div 
                className="bg-gradient-to-r from-brand-secondary to-brand-primary h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(percentageUsed, 100)}%` }}
            ></div>
        </div>
    </div>
  );
};
