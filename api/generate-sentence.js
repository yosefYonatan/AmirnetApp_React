import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { word, show, translation } = req.body ?? {};

  if (!word || typeof word !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "word" field' });
  }

  const showContext = show
    ? `The user is currently watching the TV show "${show}". Write a sentence that could plausibly appear in that show's dialogue.`
    : 'Write a natural conversational sentence.';

  const translationHint = translation ? ` (Hebrew: ${translation})` : '';

  try {
    const message = await client.messages.create({
      model:      'claude-opus-4-6',
      max_tokens: 120,
      thinking:   { type: 'adaptive' },
      messages: [{
        role:    'user',
        content: `${showContext}

Create exactly ONE short, natural example sentence (under 20 words) using the English word "${word}"${translationHint}. The sentence should feel like real TV dialogue — casual, vivid, and memorable.

Return ONLY the sentence itself. No quotes, no explanations, no labels.`,
      }],
    });

    // Extract text block (skip thinking blocks)
    const textBlock = message.content.find(b => b.type === 'text');
    const sentence  = textBlock?.text?.trim() ?? '';

    return res.status(200).json({ sentence });
  } catch (err) {
    console.error('[generate-sentence] error:', err?.message ?? err);
    return res.status(500).json({ error: 'Sentence generation failed' });
  }
}
