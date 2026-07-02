import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSentiment = SlateTool.create(spec, {
  name: 'Get Market Sentiment',
  key: 'get_sentiment',
  description: `Retrieve crypto market sentiment analysis collected from Twitter, Reddit, and Telegram. Includes sentiment grades and labels for each platform, along with news summaries. Useful for gauging the overall market mood and social media discussion trends.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of results per page (default: 50)'),
      page: z.number().optional().describe('Page number for pagination (default: 1)')
    })
  )
  .output(
    z.object({
      sentiments: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of sentiment records with platform-specific grades and summaries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getSentiments({
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let sentiments = result?.data ?? [];

    return {
      output: { sentiments },
      message: `Retrieved **${sentiments.length}** sentiment record(s).`
    };
  })
  .build();
