import { GoogleGenAI, Modality } from '@google/genai';
import { fileToGenerativePart } from '../utils/fileUtils';

// The GoogleGenAI instance is now created per-request inside the function.

export interface EditImageResult {
  imageUrl: string;
  tokensUsed: number;
}

export const editImage = async (
  file: File,
  prompt: string,
  apiKey: string
): Promise<EditImageResult> => {
  if (!apiKey) {
    throw new Error('API kulcs hiányzik. Kérlek, add meg az API kulcsodat.');
  }
  
  const ai = new GoogleGenAI({ apiKey });

  try {
    const { base64, mimeType } = await fileToGenerativePart(file);

    const imagePart = {
      inlineData: {
        data: base64,
        mimeType: mimeType,
      },
    };

    const textPart = {
      text: prompt,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });
    
    // 1. Először ellenőrizzük, hogy a kérést magát blokkolta-e a rendszer.
    if (response.promptFeedback?.blockReason) {
        throw new Error(
            `A generálás sikertelen volt, mert a kérésedet blokkolta a rendszer. ` +
            `Ok: ${response.promptFeedback.blockReason}. ` +
            `${response.promptFeedback.blockReasonMessage || ''}`
        );
    }

    const tokensUsed = response.usageMetadata?.totalTokenCount ?? 0;
    const candidate = response.candidates?.[0];

    // 2. Ellenőrizzük, hogy a modell adott-e egyáltalán "jelölt" választ.
    if (!candidate) {
        throw new Error('Az API nem adott vissza érvényes választ. Ez előfordulhat hálózati hiba vagy szerveroldali probléma miatt.');
    }

    // 3. Keressük a képet a válaszban.
    if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            const imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            return { imageUrl, tokensUsed };
          }
        }
    }

    // 4. Ha nincs kép, specifikusabb okot keresünk.
    if (candidate.finishReason === 'SAFETY') {
        throw new Error('A generálás sikertelen volt biztonsági okokból. Kérlek, próbálj meg más utasítást adni, vagy használj másik képet.');
    }

    // 5. Ellenőrizzük, hogy az API szöveget adott-e kép helyett.
    const responseText = response.text?.trim();
    if (responseText) {
        throw new Error(`Az API szöveges választ adott a kép helyett: "${responseText}"`);
    }

    // 6. Végső, általános hibaüzenet, ha semmi mást nem találtunk.
    throw new Error('Az API nem generált képet. A válasz nem tartalmazta a várt képadatokat, és nem adott meg konkrét hibaokot.');

  } catch (error) {
    console.error('Hiba a kép szerkesztése közben a Gemini API-val:', error);
    if (error instanceof Error) {
        // Handle specific API key error message from Gemini
        if (error.message.includes('API key not valid')) {
            throw new Error('Érvénytelen API kulcs. Kérlek, ellenőrizd a megadott kulcsot.');
        }
        throw error;
    }
    throw new Error('Kép generálása sikertelen egy ismeretlen hiba miatt.');
  }
};
