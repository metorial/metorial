import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateDiscussion = SlateTool.create(spec, {
  name: 'Update Discussion',
  key: 'update_discussion',
  description:
    'Edit the title or context of a discussion the API-key user is allowed to edit.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      discussionId: z
        .number()
        .int()
        .positive()
        .describe('Discussion ID returned by get_discussion or list_discussions'),
      title: z.string().min(1).optional().describe('Updated discussion title'),
      description: z
        .string()
        .optional()
        .describe('Updated discussion context; an empty string clears it'),
      descriptionFormat: z
        .enum(['md', 'html'])
        .optional()
        .describe('Format of the updated context')
    })
  )
  .output(
    z.object({
      discussionId: z.number(),
      discussionKey: z.string(),
      title: z.string(),
      description: z.string().optional(),
      descriptionFormat: z.string().optional(),
      groupId: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.title === undefined && ctx.input.description === undefined) {
      throw createApiServiceError('Provide title or description to update the discussion.');
    }
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let discussion = await client.updateDiscussion(ctx.input.discussionId, ctx.input);
    return {
      output: {
        discussionId: discussion.id,
        discussionKey: discussion.key,
        title: discussion.title,
        description: discussion.description ?? undefined,
        descriptionFormat: discussion.description_format ?? undefined,
        groupId: discussion.group_id ?? undefined
      },
      message: `Updated discussion "${discussion.title}" (${discussion.id}).`
    };
  })
  .build();
