import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateTextResponse = async (
  prompt: string, 
  imageBase64?: string
): Promise<string> => {
  try {
    let response: GenerateContentResponse;

    if (imageBase64) {
      // Vision Request
      const base64Data = imageBase64.split(',')[1] || imageBase64;
      response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Data,
              },
            },
            { text: prompt },
          ],
        },
      });
    } else {
      // Text Request
      response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
    }

    return response.text || "No response text found.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const performOCR = async (imageBase64: string): Promise<string> => {
  if (!apiKey) {
    throw new Error("Gemini API Key가 설정되지 않았습니다. AI Studio의 'Settings' 메뉴에서 GEMINI_API_KEY를 설정해주세요.");
  }
  
  try {
    const base64Data = imageBase64.split(',')[1] || imageBase64;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data,
            },
          },
          { text: "Extract the text or numerical value from this image. Return ONLY the value itself without any explanation or extra characters. If it's a number, return just the number. If there are multiple values, return the most prominent one. If no text is found, return an empty string." },
        ],
      },
    });

    const text = response.text?.trim();
    if (!text) {
      return "";
    }

    return text;
  } catch (error: any) {
    console.error("OCR Error:", error);
    if (error.message?.includes('API key not valid')) {
      throw new Error("API Key가 유효하지 않습니다. 설정을 확인해주세요.");
    }
    throw new Error(`AI 처리 중 오류가 발생했습니다: ${error.message || '네트워크 상태를 확인해주세요.'}`);
  }
};

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    // Using gemini-2.5-flash-image as requested for standard generation
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
            aspectRatio: "1:1",
        }
      }
    });

    // Extract image from parts
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data returned from API");
  } catch (error) {
    console.error("Image Gen Error:", error);
    throw error;
  }
};

export const getLiveClient = () => {
    return ai;
};
