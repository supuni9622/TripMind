import OpenAI from 'openai';

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
  return new OpenAI({ apiKey });
}

const EMBEDDING_MODEL = 'text-embedding-3-small';
const CHAT_MODEL = 'gpt-4o-mini';
const TTS_MODEL = 'tts-1-hd';
const IMAGE_MODEL = 'dall-e-3';

export async function moderateInput(text: string): Promise<{ flagged: boolean; categories?: Record<string, boolean> }> {
  const r = await getOpenAI().moderations.create({ input: text });
  const result = r.results[0];
  return { flagged: result.flagged, categories: result.categories as unknown as Record<string, boolean> };
}

export async function createEmbedding(text: string): Promise<number[]> {
  const r = await getOpenAI().embeddings.create({ model: EMBEDDING_MODEL, input: text });
  return r.data[0].embedding;
}

export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const r = await getOpenAI().embeddings.create({ model: EMBEDDING_MODEL, input: texts });
  return r.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export async function chat(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: { temperature?: number; max_tokens?: number; response_format?: { type: 'text' | 'json_object' } }
): Promise<string> {
  const completion = await getOpenAI().chat.completions.create({
    model: CHAT_MODEL,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.max_tokens ?? 2048,
    ...(options?.response_format && { response_format: options.response_format }),
  });
  const content = completion.choices[0]?.message?.content;
  return content ?? '';
}

export async function textToSpeech(text: string, voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'alloy'): Promise<Buffer> {
  const response = await getOpenAI().audio.speech.create({
    model: TTS_MODEL,
    voice,
    input: text.slice(0, 4096),
  });
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function generateImage(prompt: string): Promise<string> {
  const response = await getOpenAI().images.generate({
    model: IMAGE_MODEL,
    prompt,
    n: 1,
    size: '1024x1024',
    response_format: 'b64_json',
  });
  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image generated');
  return b64;
}
