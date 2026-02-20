import { GoogleGenAI, Modality } from '@google/genai';
import { fileToGenerativePart } from '../utils/fileUtils';

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
    throw new Error("API kulcs szükséges a művelethez.");
  }
  const ai = new GoogleGenAI({ apiKey: apiKey });

  try {
    const { base64, mimeType } = await fileToGenerativePart(file);

    const imagePart = {
      inlineData: {
        data: base64,
        mimeType: mimeType,
      },
    };

    const textPart = {
      text: `${prompt}\n\nIMPORTANT: You are an image editing tool. Output ONLY the edited image. Do not describe it.`,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [imagePart, textPart] },
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
        // Logoljuk a kapott részek típusait a hibakereséshez
        const partTypes = candidate.content?.parts?.map(p => Object.keys(p).join(',')).join('; ') || 'unknown';
        console.log('Full response:', JSON.stringify(response, null, 2));
        throw new Error(`Az API szöveges választ adott a kép helyett: "${responseText}". (Kapott részek: ${partTypes})`);
    }

    // 6. Végső, általános hibaüzenet, ha semmi mást nem találtunk.
    console.log('Full response:', JSON.stringify(response, null, 2));
    const finishReason = candidate.finishReason || 'Unknown';
    if (finishReason === 'IMAGE_OTHER') {
        throw new Error('A kép generálása sikertelen volt (IMAGE_OTHER). Ez általában akkor fordul elő, ha a modell nem tudja értelmezni a kérést képmanipulációként, vagy a kért művelet túl komplex. Kérlek, próbáld meg egyszerűbb utasítással.');
    }
    throw new Error(`Az API nem generált képet. A válasz nem tartalmazta a várt képadatokat. Finish reason: ${finishReason}`);

  } catch (error) {
    console.error('Hiba a kép szerkesztése közben a Gemini API-val:', error);
    if (error instanceof Error) {
        // Handle specific API key error message from Gemini
        if (error.message.includes('API key not valid')) {
            throw new Error('Érvénytelen API kulcs. Ellenőrizd a kulcsot és próbáld újra.');
        }
        throw error;
    }
    throw new Error('Kép generálása sikertelen egy ismeretlen hiba miatt.');
  }
};