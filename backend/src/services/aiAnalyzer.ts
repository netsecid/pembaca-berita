import axios from 'axios';
import { FeedItem, AIAnalysis, updateFeedAnalysis, getUnanalyzedItems } from './feedStore';

export interface AISettings {
  provider: 'openai' | 'anthropic' | 'gemini' | 'custom';
  apiKey: string;
  model: string;
  baseUrl?: string;
}

const ANALYSIS_PROMPT = (title: string, description: string, sourceName: string): string => `
You are a cybersecurity intelligence analyst. Analyze the following news article and return a structured JSON response.

Source: ${sourceName}
Title: ${title}
Content: ${description.substring(0, 2000)}

Return ONLY a valid JSON object with these fields:
{
  "summary": "2-3 sentence summary of the key security implications",
  "urgency": "critical|high|medium|low",
  "severity": "critical|high|medium|low|informational",
  "category": "one of: Vulnerability, Malware, Data Breach, Threat Intelligence, Advisory, Ransomware, APT, Phishing, Supply Chain, Zero-Day, Patch, Other",
  "target_industry": ["array of affected industries, e.g. Finance, Healthcare, Government"],
  "threat_actor": ["array of threat actor names if mentioned, empty if none"],
  "target_country": ["array of targeted countries if mentioned, empty if none"],
  "ttps": ["array of MITRE ATT&CK techniques if applicable, e.g. T1566.001 Phishing"],
  "tags": ["array of relevant tags/keywords"]
}

Be concise and accurate. Base analysis only on the provided content.
`.trim();

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface AnthropicResponse {
  content: Array<{
    text: string;
  }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

function extractJson(text: string): AIAnalysis | null {
  // Try to extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]) as AIAnalysis;
  } catch {
    return null;
  }
}

async function callOpenAI(
  prompt: string,
  apiKey: string,
  model: string,
  baseUrl?: string
): Promise<string> {
  const url = baseUrl
    ? `${baseUrl}/chat/completions`
    : 'https://api.openai.com/v1/chat/completions';

  const response = await axios.post<OpenAIResponse>(
    url,
    {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 800,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  return response.data.choices[0]?.message?.content || '';
}

async function callAnthropic(
  prompt: string,
  apiKey: string,
  model: string
): Promise<string> {
  const response = await axios.post<AnthropicResponse>(
    'https://api.anthropic.com/v1/messages',
    {
      model,
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  return response.data.content[0]?.text || '';
}

async function callGemini(
  prompt: string,
  apiKey: string,
  model: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await axios.post<GeminiResponse>(
    url,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 800,
      },
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    }
  );

  return response.data.candidates[0]?.content?.parts[0]?.text || '';
}

export async function analyzeItem(
  item: FeedItem,
  settings: AISettings
): Promise<AIAnalysis | null> {
  if (!settings.apiKey) return null;

  const prompt = ANALYSIS_PROMPT(item.title, item.description, item.source_name);

  try {
    let responseText = '';

    switch (settings.provider) {
      case 'openai':
        responseText = await callOpenAI(prompt, settings.apiKey, settings.model);
        break;
      case 'anthropic':
        responseText = await callAnthropic(prompt, settings.apiKey, settings.model);
        break;
      case 'gemini':
        responseText = await callGemini(prompt, settings.apiKey, settings.model);
        break;
      case 'custom':
        responseText = await callOpenAI(
          prompt,
          settings.apiKey,
          settings.model,
          settings.baseUrl
        );
        break;
      default:
        console.warn(`Unknown AI provider: ${settings.provider}`);
        return null;
    }

    const analysis = extractJson(responseText);
    if (!analysis) {
      console.warn(`Failed to parse AI response for item ${item.id}`);
      return null;
    }

    return analysis;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`AI analysis failed for item ${item.id}: ${message}`);
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function analyzeNewItems(
  items: FeedItem[],
  settings: AISettings,
  delayMs = 500
): Promise<number> {
  if (!settings.apiKey || items.length === 0) return 0;

  let analyzed = 0;

  for (const item of items) {
    try {
      const analysis = await analyzeItem(item, settings);
      if (analysis) {
        updateFeedAnalysis(item.id, analysis);
        analyzed++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Failed to analyze item ${item.id}: ${message}`);
    }

    if (delayMs > 0) {
      await sleep(delayMs);
    }
  }

  return analyzed;
}

export async function analyzeUnanalyzedItems(settings: AISettings): Promise<number> {
  if (!settings.apiKey) return 0;

  const items = getUnanalyzedItems(50);
  if (items.length === 0) return 0;

  console.log(`Analyzing ${items.length} unanalyzed items...`);
  return analyzeNewItems(items, settings);
}
