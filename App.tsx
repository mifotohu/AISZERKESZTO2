import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { EditorControls } from './components/EditorControls';
import { ImageViewer } from './components/ImageViewer';
import { editImage } from './services/geminiService';

const DAILY_TOKEN_LIMIT = 1000000;
const TOKEN_STORAGE_KEY = 'mifoto_token_usage';

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
  }, []);

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

    setLoadingAction(action);
    setEditedImage(null);
    setError(null);

    try {
      const result = await editImage(originalFile, promptToUse);
      setEditedImage(result.imageUrl);
      
      const newTotalTokens = tokensUsedToday + result.tokensUsed;
      setTokensUsedToday(newTotalTokens);
      
      const today = new Date().toISOString().split('T')[0];
      const newUsage: TokenUsage = { count: newTotalTokens, date: today };
      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(newUsage));

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
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

  const percentageUsed = DAILY_TOKEN_LIMIT > 0 ? (tokensUsedToday / DAILY_TOKEN_LIMIT) * 100 : 0;

  return (
    <div className="min-h-screen bg-base-100 text-text-primary font-sans flex flex-col">
      <Header />
      <main className="container mx-auto px-4 md:px-8 py-8 flex-grow">
        <div className="mb-6 bg-base-200 p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-2 text-sm">
              <span className="font-semibold text-text-primary">Napi Token Felhasználás (becsült)</span>
              <span className="text-text-secondary">{tokensUsedToday.toLocaleString()} / {DAILY_TOKEN_LIMIT.toLocaleString()}</span>
          </div>
          <div className="w-full bg-base-300 rounded-full h-2.5">
              <div 
                  className="bg-gradient-to-r from-brand-secondary to-brand-primary h-2.5 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(percentageUsed, 100)}%` }}
              ></div>
          </div>
        </div>

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
