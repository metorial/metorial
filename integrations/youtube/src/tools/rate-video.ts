import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { youtubeServiceError } from '../lib/errors';
import { youtubeActionScopes } from '../scopes';
import { spec } from '../spec';

export let rateVideo = SlateTool.create(spec, {
  name: 'Rate Video',
  key: 'rate_video',
  description: `Rate a YouTube video (like, dislike, or remove rating). Can also retrieve the authenticated user's current rating for one or more videos.`,
  instructions: [
    'Use action "rate" to set a rating and "getRating" to check existing ratings.'
  ]
})
  .scopes(youtubeActionScopes.rateVideo)
  .input(
    z.object({
      action: z
        .enum(['rate', 'getRating'])
        .describe('Whether to set a rating or get current ratings'),
      videoId: z.string().describe('Video ID to rate, or comma-separated IDs for getRating'),
      rating: z
        .enum(['like', 'dislike', 'none'])
        .optional()
        .describe('Rating to set (required for "rate" action)')
    })
  )
  .output(
    z.object({
      ratings: z
        .array(
          z.object({
            videoId: z.string(),
            rating: z.string()
          })
        )
        .optional(),
      rated: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromAuth(ctx.auth);

    if (ctx.input.action === 'rate') {
      if (!ctx.input.rating) {
        throw youtubeServiceError('Rating is required when action is "rate"');
      }
      await client.rateVideo(ctx.input.videoId, ctx.input.rating);
      return {
        output: { rated: true },
        message: `Set rating to **${ctx.input.rating}** on video \`${ctx.input.videoId}\`.`
      };
    } else {
      let videoIds = ctx.input.videoId.split(',').map(id => id.trim());
      let response = await client.getVideoRating(videoIds);
      return {
        output: {
          ratings: response.items.map(item => ({
            videoId: item.videoId,
            rating: item.rating
          }))
        },
        message: `Retrieved ratings for **${response.items.length}** video(s).`
      };
    }
  })
  .build();
