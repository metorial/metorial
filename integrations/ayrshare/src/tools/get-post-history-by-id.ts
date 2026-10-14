import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPostHistoryById = SlateTool.create(spec, {
  key: 'get_post_history_by_id',
  name: 'Get Post History by ID',
  description:
    'Retrieve one post by its Ayrshare Post ID, including publication status, social post IDs, URLs, errors, and scheduling details. Use this to check a scheduled or retried post.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      postId: z.string().describe('Ayrshare Post ID from create_post or get_post_history')
    })
  )
  .output(
    z.object({
      post: z
        .record(z.string(), z.unknown())
        .describe('Post details with the original provider fields')
    })
  )
  .handleInvocation(async ctx => {
    let post = await new Client({
      ...ctx.auth,
      profileKey: ctx.config.profileKey
    }).getHistoryById(ctx.input.postId);
    return {
      output: { post },
      message: `Retrieved history for post **${ctx.input.postId}**. Status: **${post.status}**.`
    };
  })
  .build();
