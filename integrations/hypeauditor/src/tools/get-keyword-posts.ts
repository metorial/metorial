import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getKeywordPosts = SlateTool.create(spec, {
  name: 'Get Keyword Posts',
  key: 'get_keyword_posts',
  description:
    "Retrieve posts identified by an influencer discovery content search, including captions and engagement metrics. First call discover_influencers with searchContent and use the content IDs in each result's features.search_content.",
  tags: { readOnly: true }
})
  .input(
    z.object({
      socialNetwork: z
        .enum(['instagram', 'youtube', 'tiktok', 'twitter'])
        .describe('Social network used in the discovery content search'),
      contentIds: z
        .array(z.string())
        .min(1)
        .describe('Content IDs returned in features.search_content by discover_influencers')
    })
  )
  .output(
    z.object({
      posts: z
        .any()
        .describe('Post map keyed by content ID, including basic information and metrics'),
      remainingQueries: z.number().optional().describe('Remaining discovery query credits')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.contentIds.some(id => !id.trim() || id.includes(','))) {
      throw createApiServiceError('Provide non-empty content IDs separately, without commas.');
    }
    let client = new Client({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      apiVersion: ctx.config.apiVersion
    });
    let response = await client.getKeywordPosts(ctx.input.socialNetwork, ctx.input.contentIds);
    let result = response?.result ?? response;
    return {
      output: { posts: result?.posts ?? {}, remainingQueries: result?.queries_left },
      message: `Retrieved keyword-search posts from ${ctx.input.socialNetwork}.`
    };
  })
  .build();
