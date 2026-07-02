import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let analyzeSentiment = SlateTool.create(spec, {
  name: 'Analyze Sentiment',
  key: 'analyze_sentiment',
  description: `Analyze the emotional tone of text using AI-powered sentiment analysis. Returns a sentiment label (positive, negative, neutral), score, and comparative metric. Useful for customer feedback analysis, social media monitoring, and content evaluation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().describe('The text to analyze for sentiment')
    })
  )
  .output(
    z.object({
      sentimentLabel: z
        .string()
        .describe('Sentiment label (e.g. "positive", "negative", "neutral")'),
      sentimentScore: z.number().describe('Raw sentiment score'),
      comparativeScore: z
        .number()
        .describe('Comparative sentiment metric (score normalized by word count)'),
      isPositive: z.boolean().describe('Whether the sentiment is positive'),
      isNegative: z.boolean().describe('Whether the sentiment is negative'),
      normalizedScore: z
        .number()
        .optional()
        .describe('Score normalized to -1 to 1 range (paid plans only)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.analyzeSentiment(ctx.input.text);

    if (result.status === 'error' || !result.data) {
      throw new Error(result.error || 'Sentiment analysis failed');
    }

    let data = result.data;
    let output = {
      sentimentLabel: data.sentimentText,
      sentimentScore: data.sentiment,
      comparativeScore: data.comparative,
      isPositive: data.isPositive,
      isNegative: data.isNegative,
      normalizedScore: data.normalizedScore
    };

    return {
      output,
      message: `Sentiment is **${data.sentimentText}** (score: ${data.sentiment}, comparative: ${data.comparative}).`
    };
  })
  .build();
