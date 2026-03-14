import Anthropic from '@anthropic-ai/sdk';

// Server-side only — ANTHROPIC_API_KEY is never exposed to the browser.
// This runs as a Vercel Serverless Function under /api/generate-sentence.

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Guard: API key must be set in Vercel environment variables
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[generate-sentence] ANTHROPIC_API_KEY is not set');
    return res.status(503).json({ error: 'AI service not configured' });
  }

  const { word, show, translation } = req.body ?? {};

  // Basic input validation to prevent abuse
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
      // claude-haiku-4-5 — fast and cost-effective (~100x cheaper than Opus)
      model:      'claude-haiku-4-5-20251001',
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
    console.error('[generate-sentence] error:', err?.message ?? err);
    return res.status(500).json({ error: 'Sentence generation failed' });
  }
}
