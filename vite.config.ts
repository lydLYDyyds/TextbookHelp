import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const readJsonBody = async (req: any) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
};

const API_TIMEOUT_MS = 60_000;

const proxyFetch = async (url: string, options: RequestInit) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'api-proxies',
        configureServer(server) {
          // ── DeepSeek proxy ────────────────────────────────────
          server.middlewares.use('/api/deepseek/chat', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }

            try {
              const apiKey = env.DEEPSEEK_API_KEY;
              if (!apiKey || apiKey === 'replace_with_your_deepseek_api_key') {
                res.statusCode = 503;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'DEEPSEEK_API_KEY is missing in .env.local. Restart npm run dev after setting it.' }));
                return;
              }

              const body = await readJsonBody(req);
              const model = env.DEEPSEEK_MODEL || 'deepseek-v4-pro';

              // Build messages array
              const messages: Array<{ role: string; content: string }> = [];

              // New multi-turn chat format
              if (body.systemPrompt) {
                messages.push({ role: 'system', content: body.systemPrompt });
                if (body.history) {
                  for (const h of body.history) {
                    messages.push({
                      role: h.role === 'user' ? 'user' : 'assistant',
                      content: h.text,
                    });
                  }
                }
                messages.push({ role: 'user', content: body.newMessage || '' });
              } else {
                // Legacy single-prompt format
                messages.push({ role: 'system', content: body.prompt });
                messages.push({
                  role: 'user',
                  content: `Use the following extracted PDF text as the source material.\n\n${body.pdfText || ''}`,
                });
              }

              const dsBody: any = {
                model,
                thinking: { type: 'disabled' },
                messages,
                max_tokens: 8192,
                temperature: 0.4,
              };

              // Only add json_object for legacy mode
              if (!body.systemPrompt) {
                dsBody.response_format = { type: 'json_object' };
              }

              const response = await proxyFetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify(dsBody),
              });

              const text = await response.text();
              if (!response.ok) {
                res.statusCode = response.status;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: text }));
                return;
              }

              const data = JSON.parse(text);
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ content: data.choices?.[0]?.message?.content || '' }));
            } catch (error: any) {
              res.statusCode = error.name === 'AbortError' ? 504 : 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: error?.message || 'DeepSeek proxy failed' }));
            }
          });

          // ── Gemini proxy ─────────────────────────────────────
          server.middlewares.use('/api/gemini/chat', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }

            try {
              const apiKey = env.GEMINI_API_KEY;
              if (!apiKey || apiKey === 'replace_with_your_gemini_api_key') {
                res.statusCode = 503;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'GEMINI_API_KEY is missing in .env.local. Restart npm run dev after setting it.' }));
                return;
              }

              const body = await readJsonBody(req);
              const model = body.model || 'gemini-2.5-flash';

              let contents: any[];

              // New multi-turn chat format
              if (body.systemPrompt) {
                contents = [
                  { role: 'user', parts: [{ text: body.systemPrompt }] },
                ];
                if (body.history) {
                  for (const h of body.history) {
                    contents.push({
                      role: h.role === 'user' ? 'user' : 'model',
                      parts: [{ text: h.text }],
                    });
                  }
                }
                contents.push({ role: 'user', parts: [{ text: body.newMessage || '' }] });
              } else {
                // Legacy single-prompt format
                contents = [{ parts: [{ text: body.prompt }] }];
                if (body.pdfText) {
                  contents[0].parts.push({ text: `\n\nPDF text excerpt:\n${body.pdfText}` });
                }
                if (body.fileData) {
                  contents[0].parts.push({ inlineData: body.fileData });
                }
              }

              const geminiBody: any = {
                contents,
                generationConfig: {},
              };

              // Only add structured output for legacy mode
              if (!body.systemPrompt && body.responseSchema) {
                geminiBody.generationConfig.responseMimeType = 'application/json';
                geminiBody.generationConfig.responseSchema = body.responseSchema;
              }

              const response = await proxyFetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey,
                  },
                  body: JSON.stringify(geminiBody),
                },
              );

              const text = await response.text();
              if (!response.ok) {
                res.statusCode = response.status;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: text }));
                return;
              }

              const data = JSON.parse(text);
              const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ content }));
            } catch (error: any) {
              res.statusCode = error.name === 'AbortError' ? 504 : 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: error?.message || 'Gemini proxy failed' }));
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
