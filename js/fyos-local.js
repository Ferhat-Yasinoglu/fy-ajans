/* FYOS yerel yapay zekâ
   Model ziyaretçinin kendi cihazında, tarayıcıda (WebGPU) çalışır. Sunucu, hesap,
   API anahtarı ve ücret yok. Model dosyaları ilk kullanımda bir kez iner ve tarayıcı
   önbelleğinde kalır. main.js bu modülü yalnızca gerektiğinde yükler. */

const WEBLLM = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.84/+esm';

let enginePromise = null;
let currentModel = '';

export function supported() {
  return typeof navigator !== 'undefined' && !!navigator.gpu;
}

/* Modeli (bir kez) yükler. onProgress(yüzde 0-100, metin) */
export function load(modelId, onProgress) {
  if (enginePromise && currentModel === modelId) return enginePromise;
  currentModel = modelId;
  enginePromise = (async () => {
    const webllm = await import(WEBLLM);
    const engine = await webllm.CreateMLCEngine(modelId, {
      initProgressCallback: (p) => {
        if (onProgress) onProgress(Math.round((p.progress || 0) * 100), p.text || '');
      }
    });
    return engine;
  })().catch((e) => { enginePromise = null; throw e; });
  return enginePromise;
}

/* Sohbet: messages = [{role, content}], onToken(şimdiye kadarki metin) */
export async function ask(engine, messages, onToken, opts = {}) {
  const stream = await engine.chat.completions.create({
    messages,
    stream: true,
    temperature: opts.temperature ?? 0.4,
    top_p: 0.9,
    frequency_penalty: 0.7,
    presence_penalty: 0.3,
    max_tokens: opts.maxTokens ?? 160
  });
  let text = '';
  for await (const chunk of stream) {
    const delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content;
    if (delta) { text += delta; if (onToken) onToken(text); }
  }
  return text.trim();
}

/* main.js klasik betik olduğu için modülü buradan alır */
if (typeof window !== 'undefined') window.FYOS_LOCAL = { supported, load, ask };
