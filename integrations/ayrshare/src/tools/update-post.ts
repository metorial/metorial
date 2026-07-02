import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updatePost = SlateTool.create(spec, {
  name: 'Update Post',
  key: 'update_post',
  description: `Update a scheduled or pending post. Can approve posts that require approval, update the schedule date, or pause/unpause scheduled posts.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      postId: z.string().describe('Ayrshare Post ID to update'),
      approved: z
        .boolean()
        .optional()
        .describe('Set to true to approve a post pending approval'),
      scheduleDate: z
        .string()
        .optional()
        .describe('New UTC ISO 8601 schedule date for the post')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Update status'),
      postId: z.string().optional().describe('The updated post ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      profileKey: ctx.config.profileKey
    });

    let result = await client.updatePost({
      postId: ctx.input.postId,
      approved: ctx.input.approved,
      scheduleDate: ctx.input.scheduleDate
    });

    let actions: string[] = [];
    if (ctx.input.approved) actions.push('approved');
    if (ctx.input.scheduleDate) actions.push(`rescheduled to ${ctx.input.scheduleDate}`);

    return {
      output: {
        status: result.status || 'success',
        postId: ctx.input.postId
      },
      message: `Post **${ctx.input.postId}** ${actions.join(' and ') || 'updated'}. Status: **${result.status || 'success'}**.`
    };
  })
  .build();
