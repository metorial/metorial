import { SlateTool } from 'slates';
import { z } from 'zod';
import { DotSimpleClient } from '../lib/client';
import { spec } from '../spec';

export let schedulePost = SlateTool.create(spec, {
  name: 'Schedule Post',
  key: 'schedule_post',
  description: `Schedule an existing post for publishing, or publish it immediately. Can also add a post to the publishing queue.`,
  instructions: [
    'Set postNow=true to publish immediately, or postNow=false to schedule for the configured date/time.',
    'Use addToQueue=true to add the post to the publishing queue instead of scheduling.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      postUuid: z.string().describe('UUID of the post to schedule or publish'),
      postNow: z
        .boolean()
        .optional()
        .describe(
          'If true, publish the post immediately. If false, schedule for the configured date/time.'
        ),
      addToQueue: z
        .boolean()
        .optional()
        .describe('If true, add the post to the publishing queue instead of scheduling')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DotSimpleClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId
    });

    if (ctx.input.addToQueue) {
      await client.addPostToQueue(ctx.input.postUuid);
      return {
        output: { success: true },
        message: `Post \`${ctx.input.postUuid}\` added to the publishing queue.`
      };
    }

    await client.schedulePost(ctx.input.postUuid, ctx.input.postNow ?? false);

    let action = ctx.input.postNow ? 'published immediately' : 'scheduled for publishing';
    return {
      output: { success: true },
      message: `Post \`${ctx.input.postUuid}\` ${action}.`
    };
  })
  .build();
