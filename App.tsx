import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { EditorControls } from './components/EditorControls';
import { ImageViewer } from './components/ImageViewer';
import { editImage } from './services/geminiService';
import { ApiKeyManager } from './components/ApiKeyManager';

const DAILY_TOKEN_LIMIT = 1000000;
const TOKEN_STORAGE_KEY = 'mifoto_token_usage';
const API_KEY_STORAGE_KEY = 'mifoto_api_key';

interface TokenUsage {
  count: number;
  date: string;
}

type LoadingAction = 'generate' | 'upscale' | null;

const App: React.FC = () => {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokensUsedToday, setTokensUsedToday] = useState<number>(0);
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    // Token-használat betöltése
    const storedUsage = localStorage.getItem(TOKEN_STORAGE_KEY);
    const today = new Date().toISOString().split('T')[0];
    
    if (storedUsage) {
      try {
        const parsedUsage: TokenUsage = JSON.parse(storedUsage);
        if (parsedUsage.date === today) {
          setTokensUsedToday(parsedUsage.count);
        } else {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      } catch (e) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    }
    
    // API kulcs betöltése
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedApiKey) {
        setApiKey(storedApiKey);
    }
  }, []);

  const handleSetApiKey = (key: string | null) => {
    setApiKey(key);
    if (key) {
        localStorage.setItem(API_KEY_STORAGE_KEY, key);
    } else {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  };

  const handleFileChange = (file: File | null) => {
    setOriginalFile(file);
    setEditedImage(null);
    setError(null);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setOriginalImage(null);
    }
  };
  
  const performImageEdit = async (promptToUse: string, action: NonNullable<LoadingAction>) => {
    if (!originalFile || !promptToUse) {
      return;
    }

    if (!apiKey) {
      setError("A képszerkesztéshez meg kell adnod az API kulcsodat.");
      return;
    }

    setLoadingAction(action);
    setEditedImage(null);
    setError(null);

    try {
      const result = await editImage(originalFile, promptToUse, apiKey);
      setEditedImage(result.imageUrl);
      
      const newTotalTokens = tokensUsedToday + result.tokensUsed;
      setTokensUsedToday(newTotalTokens);
      
      const today = new Date().toISOString().split('T')[0];
      const newUsage: TokenUsage = { count: newTotalTokens, date: today };
      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(newUsage));

    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('API key not valid') || err.message.includes('Érvénytelen API kulcs')) {
            setError('Érvénytelen API kulcs. Kérlek, ellenőrizd és add meg újra.');
            handleSetApiKey(null); // Clear invalid key
        } else {
            setError(err.message);
        }
      } else {
        setError('Ismeretlen hiba történt a kép generálása során.');
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleGenerate = () => {
    performImageEdit(prompt, 'generate');
  };

  const handleUpscale = () => {
    const upscalePrompt = "Növeld a kép felbontását, javítsd a részleteket és a képminőséget a stílus megváltoztatása nélkül.";
    performImageEdit(upscalePrompt, 'upscale');
  }

  return (
    <div className="min-h-screen bg-base-100 text-text-primary font-sans flex flex-col">
      <Header />
      <main className="container mx-auto px-4 md:px-8 py-8 flex-grow">
        
        <ApiKeyManager 
            apiKey={apiKey}
            setApiKey={handleSetApiKey}
            tokensUsed={tokensUsedToday}
            tokenLimit={DAILY_TOKEN_LIMIT}
        />

        {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
                <strong className="font-bold">Hiba! </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-1">
            <EditorControls
              onFileChange={handleFileChange}
              prompt={prompt}
              setPrompt={setPrompt}
              onGenerate={handleGenerate}
              onUpscale={handleUpscale}
              loadingAction={loadingAction}
              isFileSelected={!!originalFile}
            />
          </div>
          <div className="lg:col-span-2">
            <ImageViewer
              originalImage={originalImage}
              editedImage={editedImage}
              isLoading={loadingAction !== null}
            />
          </div>
        </div>
      </main>
      <footer className="container mx-auto px-4 md:px-8 py-8 text-center text-text-secondary text-sm">
        <hr className="border-base-300 my-6" />
        <p className="font-bold">MIfoto.hu - a [MI] közösségünk!</p>
        <a href="https://www.mifoto.hu" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:text-brand-secondary transition-colors">
          www.mifoto.hu
        </a>
        <p className="mt-4">Az applikáció a Google Gemini API erejét használja.</p>
        <p>A Google ingyenes kvótát biztosít, melynek keretében a napi token limit {DAILY_TOKEN_LIMIT.toLocaleString()}, a percenkénti kérések száma pedig 60.</p>
      </footer>
    </div>
  );
};

export default App;