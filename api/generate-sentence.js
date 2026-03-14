import Anthropic from '@anthropic-ai/sdk';

// Server-side only — ANTHROPIC_API_KEY is never sent to the browser.
// Runs as a Vercel Serverless Function at /api/generate-sentence.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  // Handle CORS preflight — browsers send OPTIONS before POST
  if (req.method === 'OPTIONS') {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }

  // Apply CORS headers to every response
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Guard: key must be set in Vercel → Settings → Environment Variables
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[generate-sentence] ANTHROPIC_API_KEY is not set');
    return res.status(503).json({ error: 'AI service not configured — add ANTHROPIC_API_KEY to Vercel env vars' });
  }

  const { word, show, translation } = req.body ?? {};

  if (!word || typeof word !== 'string' || word.length > 80) {
    return res.status(400).json({ error: 'Missing or invalid "word" field' });
  }

  const showContext = show
    ? `The user is watching the TV show "${show}". Write a sentence that fits that show's dialogue style.`
    : 'Write a natural conversational sentence.';

  const translationHint = translation ? ` (Hebrew meaning: ${translation})` : '';

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model:      'claude-3-haiku-20240307', // stable, widely available, cost-effective
      max_tokens: 150,
      messages: [{
        role:    'user',
        content: `${showContext}

Write ONE short, natural example sentence (under 20 words) using the English word "${word}"${translationHint}. The sentence should feel like real TV dialogue — casual, vivid, and memorable.

Return ONLY the sentence itself. No quotes, no explanations, no labels.`,
      }],
    });

    const sentence = message.content[0]?.text?.trim() ?? '';
    if (!sentence) {
      return res.status(500).json({ error: 'Empty AI response' });
    }

    return res.status(200).json({ sentence });
  } catch (err) {
    console.error('[generate-sentence] error:', err?.status, err?.message ?? err);
    return res.status(500).json({ error: 'Sentence generation failed', detail: err?.message });
  }
}
