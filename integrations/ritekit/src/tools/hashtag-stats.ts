import { SlateTool } from 'slates';
import { z } from 'zod';
import { RiteKitClient } from '../lib/client';
import { spec } from '../spec';

let statsSchema = z.object({
  tag: z.string().describe('Hashtag text without the # symbol'),
  tweets: z.number().describe('Number of tweets using this hashtag per hour'),
  exposure: z.number().describe('Estimated reach/exposure per hour'),
  retweets: z.number().describe('Number of retweets per hour'),
  images: z.number().describe('Percentage of tweets with images'),
  links: z.number().describe('Percentage of tweets with links'),
  mentions: z.number().describe('Percentage of tweets with mentions'),
  color: z.number().describe('Color grade: 1=unused, 2=overused, 3=good, 4=great/trending')
});

export let hashtagStats = SlateTool.create(spec, {
  name: 'Hashtag Stats',
  key: 'hashtag_stats',
  description: `Returns real-time engagement statistics for one or more hashtags, updated hourly. Stats include color-grading (green for trending, red for overused), exposure, and tweet volume.
Use this to evaluate which hashtags to use in your content strategy based on current performance data.`,
  constraints: ['Up to 100 hashtags can be analyzed in a single request'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      hashtags: z
        .array(z.string())
        .min(1)
        .max(100)
        .describe('List of hashtags to get stats for (without # symbol)')
    })
  )
  .output(
    z.object({
      stats: z.array(statsSchema).describe('Real-time statistics for each requested hashtag')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RiteKitClient({ token: ctx.auth.token });
    let result = await client.hashtagStats(ctx.input.hashtags);

    return {
      output: {
        stats: result.stats || []
      },
      message: `Retrieved stats for **${(result.stats || []).length}** hashtags. ${(result.stats || []).filter(s => s.color >= 3).length} are trending or performing well.`
    };
  })
  .build();
