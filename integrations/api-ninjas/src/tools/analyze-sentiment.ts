import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let analyzeSentiment = SlateTool.create(spec, {
  name: 'Analyze Sentiment',
  key: 'analyze_sentiment',
  description: `Analyze the sentiment of a text passage using AI. Returns a sentiment label (POSITIVE, NEGATIVE, NEUTRAL, WEAK_POSITIVE, WEAK_NEGATIVE) and a numerical score from -1 (most negative) to 1 (most positive).`,
  constraints: ['Maximum 2000 characters per text input.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().describe('Text to analyze for sentiment (max 2000 characters)')
    })
  )
  .output(
    z.object({
      sentiment: z
        .string()
        .describe(
          'Sentiment label: POSITIVE, WEAK_POSITIVE, NEUTRAL, WEAK_NEGATIVE, or NEGATIVE'
        ),
      score: z
        .number()
        .describe('Sentiment score from -1 (most negative) to 1 (most positive)'),
      text: z.string().describe('The text that was analyzed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getSentiment(ctx.input.text);

    return {
      output: {
        sentiment: result.sentiment,
        score: result.score,
        text: result.text
      },
      message: `Sentiment: **${result.sentiment}** (score: ${result.score})`
    };
  })
  .build();
