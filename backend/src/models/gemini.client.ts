import { GoogleGenAI } from '@google/genai';
import type { ModelRouterConfig } from '../types/agent.types.js';
import { logger } from '../utils/logger.js';

let clientInstance: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!clientInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    clientInstance = new GoogleGenAI({ apiKey });
  }
  return clientInstance;
}

function sanitizeJsonString(raw: string): string {
  let s = raw.trim();
  // Strip markdown fences
  if (s.startsWith('```json')) s = s.slice(7);
  else if (s.startsWith('```')) s = s.slice(3);
  if (s.endsWith('```')) s = s.slice(0, -3);
  s = s.trim();
  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([\]}])/g, '$1');
  return s;
}

function parseJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    // Try sanitized version
    const sanitized = sanitizeJsonString(text);
    return JSON.parse(sanitized) as T;
  }
}

export interface GeminiGenerateOptions {
  prompt: string;
  modelConfig: ModelRouterConfig;
  responseSchema?: any;
  imageParts?: Array<{ inlineData: { mimeType: string; data: string } }>;
}

export async function generateStructuredContent<T>(
  options: GeminiGenerateOptions
): Promise<{ data: T; tokenCount?: number }> {
  const ai = getClient();
  const { prompt, modelConfig, responseSchema, imageParts } = options;

  const config: any = {
    responseMimeType: 'application/json',
    temperature: modelConfig.temperature,
    maxOutputTokens: modelConfig.maxOutputTokens,
  };

  if (responseSchema) {
    config.responseSchema = responseSchema;
  }

  let contents: any;
  if (imageParts && imageParts.length > 0) {
    contents = {
      parts: [...imageParts, { text: prompt }],
    };
  } else {
    contents = prompt;
  }

  try {
    logger.info({ model: modelConfig.model }, 'Generating content with Gemini');

    const response = await ai.models.generateContent({
      model: modelConfig.model,
      contents,
      config,
    });

    const text = response.text;
    if (!text) {
      throw new Error('No response text from Gemini');
    }

    const data = parseJson<T>(text);
    const tokenCount = response.usageMetadata?.totalTokenCount;

    return { data, tokenCount };
  } catch (error: any) {
    // Fallback chain: gemini-3-*-preview → gemini-2.5-*
    const fallbackMap: Record<string, string[]> = {
      'gemini-3-pro-preview': ['gemini-2.5-pro', 'gemini-2.5-flash'],
      'gemini-3-flash-preview': ['gemini-2.5-flash'],
      'gemini-2.5-pro': ['gemini-2.5-flash'],
    };

    const fallbacks = fallbackMap[modelConfig.model];
    if (fallbacks && fallbacks.length > 0) {
      for (const fallbackModel of fallbacks) {
        try {
          logger.warn(
            { primary: modelConfig.model, fallback: fallbackModel, error: error.message },
            'Primary model failed, trying fallback'
          );

          const response = await ai.models.generateContent({
            model: fallbackModel,
            contents,
            config,
          });

          const text = response.text;
          if (!text) continue;

          const data = parseJson<T>(text);
          const tokenCount = response.usageMetadata?.totalTokenCount;
          return { data, tokenCount };
        } catch (fallbackError: any) {
          logger.warn(
            { fallback: fallbackModel, error: fallbackError.message },
            'Fallback model also failed'
          );
        }
      }
    }
    throw error;
  }
}
