import { SlateTool } from 'slates';
import { z } from 'zod';
import { RiteKitClient } from '../lib/client';
import { spec } from '../spec';

let historyEntrySchema = z.object({
  date: z.string().describe('Date of the data point'),
  tweets: z.number().describe('Number of tweets on this date'),
  retweets: z.number().describe('Number of retweets on this date'),
  exposure: z.number().describe('Estimated exposure on this date'),
  links: z.number().describe('Percentage of tweets with links'),
  photos: z.number().describe('Percentage of tweets with photos'),
  mentions: z.number().describe('Percentage of tweets with mentions'),
  color: z.number().describe('Color grade on this date')
});

export let hashtagHistory = SlateTool.create(spec, {
  name: 'Hashtag History',
  key: 'hashtag_history',
  description: `Returns 30 days of historical performance data for a single hashtag including daily tweet volume, engagement, and exposure trends.
Use this to analyze a hashtag's performance trajectory and identify patterns over time.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      hashtag: z.string().describe('Hashtag to get historical data for (without # symbol)')
    })
  )
  .output(
    z.object({
      history: z
        .array(historyEntrySchema)
        .describe('Daily historical stats for the past 30 days')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RiteKitClient({ token: ctx.auth.token });
    let result = await client.hashtagHistory(ctx.input.hashtag);

    let history = result.data || [];

    return {
      output: { history },
      message: `Retrieved **${history.length}** days of history for #${ctx.input.hashtag}.`
    };
  })
  .build();
