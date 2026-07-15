import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { youtubeActionScopes } from '../scopes';
import { spec } from '../spec';

export let getVideoRating = SlateTool.create(spec, {
  name: 'Get Video Rating',
  key: 'get_video_rating',
  description:
    "Retrieve the authenticated user's current rating for one or more YouTube videos.",
  tags: { readOnly: true }
})
  .scopes(youtubeActionScopes.getVideoRating)
  .input(
    z.object({
      videoIds: z
        .array(z.string().min(1))
        .min(1)
        .describe('YouTube video IDs whose authenticated-user ratings should be returned')
    })
  )
  .output(
    z.object({
      ratings: z
        .array(
          z.object({
            videoId: z.string().describe('YouTube video ID'),
            rating: z
              .enum(['like', 'dislike', 'none', 'unspecified'])
              .describe('Authenticated user rating')
          })
        )
        .describe('Ratings returned by YouTube')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromAuth(ctx.auth);
    let result = await client.getVideoRating(ctx.input.videoIds);
    let ratings = result.items.map(item => ({
      videoId: item.videoId,
      rating: item.rating as 'like' | 'dislike' | 'none' | 'unspecified'
    }));
    return {
      output: { ratings },
      message: `Retrieved ratings for **${ratings.length}** video(s).`
    };
  })
  .build();
