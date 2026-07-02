import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let analyzeSentiment = SlateTool.create(spec, {
  name: 'Analyze Sentiment',
  key: 'analyze_sentiment',
  description: `Determine the sentiment of a given text as positive, negative, or neutral using Metatext AI's pre-built sentiment analysis model. Useful for analyzing customer reviews, feedback, social media posts, or any text where understanding emotional tone is important.`,
  tags: {
    destructive: false,
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
      predictions: z
        .array(
          z.object({
            label: z
              .string()
              .describe('The sentiment label (e.g. positive, negative, neutral)'),
            score: z.number().describe('Confidence score for the prediction')
          })
        )
        .describe('List of sentiment predictions with confidence scores')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.analyzeSentiment(ctx.input.text);

    return {
      output: result,
      message: `Analyzed sentiment for the provided text.`
    };
  })
  .build();
