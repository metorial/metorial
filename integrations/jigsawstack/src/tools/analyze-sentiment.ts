import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let analyzeSentiment = SlateTool.create(spec, {
  name: 'Analyze Sentiment',
  key: 'analyze_sentiment',
  description: `Analyze text to determine its emotional tone and sentiment. Returns an overall sentiment classification (positive, negative, or neutral) with a confidence score, plus a sentence-by-sentence breakdown with individual emotion and sentiment analysis.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().describe('The text content to analyze for sentiment and emotion')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      sentiment: z.object({
        emotion: z.string().describe('Overall emotional tone (e.g., joy, anger, sadness)'),
        sentiment: z
          .string()
          .describe('Sentiment classification: positive, negative, or neutral'),
        score: z.number().describe('Confidence score from 0 to 1 (higher = more positive)'),
        sentences: z
          .array(
            z.object({
              text: z.string(),
              emotion: z.string(),
              sentiment: z.string(),
              score: z.number()
            })
          )
          .optional()
          .describe('Sentence-by-sentence sentiment breakdown')
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.analyzeSentiment({ text: ctx.input.text });

    return {
      output: {
        success: result.success,
        sentiment: {
          emotion: result.sentiment.emotion,
          sentiment: result.sentiment.sentiment,
          score: result.sentiment.score,
          sentences: result.sentiment.sentences
        }
      },
      message: `Sentiment analysis complete: **${result.sentiment.sentiment}** (${result.sentiment.emotion}) with a score of **${result.sentiment.score}**.`
    };
  })
  .build();
