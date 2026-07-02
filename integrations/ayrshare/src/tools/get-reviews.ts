import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getReviews = SlateTool.create(spec, {
  name: 'Get Reviews',
  key: 'get_reviews',
  description: `Retrieve reviews from Facebook Pages or Google Business Profile. Returns review text, ratings, reviewer info, and reply data.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      platform: z
        .enum(['facebook', 'gmb'])
        .describe('Platform to get reviews from (facebook or gmb for Google Business Profile)')
    })
  )
  .output(
    z.object({
      reviews: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Review objects with ratings, text, reviewer info, and timestamps')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      profileKey: ctx.config.profileKey
    });

    let result = await client.getReviews({
      platform: ctx.input.platform
    });

    let reviews = Array.isArray(result) ? result : result.reviews || [];

    return {
      output: {
        reviews
      },
      message: `Retrieved **${reviews.length}** reviews from **${ctx.input.platform === 'gmb' ? 'Google Business Profile' : 'Facebook'}**.`
    };
  })
  .build();
