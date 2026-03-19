import axios from 'axios';
import { FeedItem, AIAnalysis, updateFeedAnalysis, getUnanalyzedItems } from './feedStore';

// Silent prompt injection guardrails — applied before any user-supplied prompt is used
function sanitizeCustomPrompt(raw: string | undefined): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  let s = raw.substring(0, 3000).replace(/<[^>]+>/g, '');
  const blockedPatterns = [
    /ignore\s+(all\s+)?previous\s+(instructions?|prompts?|context)/gi,
    /you\s+are\s+now\s+(a|an)\s+/gi,
    /disregard\s+(all\s+)?previous/gi,
    /forget\s+(all\s+)?previous/gi,
    /override\s+(all\s+)?instructions/gi,
    /\[system\]/gi,
    /\[INST\]/g,
    /<\|[^|]*\|>/g,
    /#+\s*system\s*prompt/gi,
  ];
  for (const p of blockedPatterns) s = s.replace(p, '');
  return s.trim() || undefined;
}

export interface AISettings {
  provider: 'openai' | 'anthropic' | 'gemini' | 'custom';
  apiKey: string;
  model: string;
  baseUrl?: string;
}

const DEFAULT_SYSTEM_INSTRUCTIONS = `You are a senior cybersecurity threat intelligence analyst.`;

const ANALYSIS_PROMPT = (title: string, description: string, sourceName: string, customInstructions?: string): string => `
${customInstructions ? customInstructions + '\n\n' : DEFAULT_SYSTEM_INSTRUCTIONS + ' '}Analyze the following news article and return a structured JSON response.

Source: ${sourceName}
Title: ${title}
Content: ${description.substring(0, 2000)}

Return ONLY a valid JSON object with these exact fields (use empty arrays [] when no data is found — never omit a field):
{
  "summary": "2-3 sentence summary focused on security implications and what defenders should know",
  "urgency": "critical|high|medium|low  (critical=active exploitation/immediate risk, high=significant threat, medium=notable but limited, low=informational/advisory)",
  "severity": "critical|high|medium|low|informational",
  "category": "one of: Vulnerability, Malware, Data Breach, Threat Intelligence, Advisory, Ransomware, APT, Phishing, Supply Chain, Zero-Day, Patch, Other",
  "target_industry": ["affected industry verticals — be specific: Finance, Healthcare, Government, Energy, Telecommunications, Retail, Manufacturing, Defense, Education, Technology, Critical Infrastructure, etc."],
  "threat_actor": ["named threat actor groups or individuals explicitly mentioned, e.g. APT28, Lazarus Group, REvil — empty if none named"],
  "target_country": ["targeted or victim nations explicitly mentioned, e.g. United States, Indonesia, Germany — empty if none"],
  "ttps": ["MITRE ATT&CK technique IDs with names if inferable, e.g. T1566.001 Spearphishing Attachment, T1190 Exploit Public-Facing Application"],
  "cve_ids": ["CVE identifiers explicitly mentioned, e.g. CVE-2024-12345 — empty if none"],
  "affected_products": ["specific software, platforms, hardware or services mentioned as vulnerable or targeted, e.g. Microsoft Exchange, Cisco IOS, Apache Log4j, Fortinet FortiOS"],
  "malware_families": ["specific malware family or tool names mentioned, e.g. Cobalt Strike, Emotet, LockBit, QakBot — empty if none"],
  "tags": ["5-10 concise keyword tags summarizing the article topic"]
}

Be thorough in extraction. If a country, product, CVE, or threat actor is mentioned anywhere in the content, include it.
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
  settings: AISettings,
  customPrompt?: string
): Promise<AIAnalysis | null> {
  if (!settings.apiKey) return null;

  const sanitized = sanitizeCustomPrompt(customPrompt);
  const prompt = ANALYSIS_PROMPT(item.title, item.description, item.source_name, sanitized);

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
  delayMs = 500,
  customPrompt?: string
): Promise<number> {
  if (!settings.apiKey || items.length === 0) return 0;

  let analyzed = 0;

  for (const item of items) {
    try {
      const analysis = await analyzeItem(item, settings, customPrompt);
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
