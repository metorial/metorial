import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { groupIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createDiscussion = SlateTool.create(spec, {
  name: 'Create Discussion',
  key: 'create_discussion',
  description: `Create a new discussion thread in a Loomio group. Supports Markdown or HTML content, and can notify specific users, email addresses, or the entire group upon creation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title of the discussion thread'),
      description: z
        .string()
        .optional()
        .describe('Body content of the discussion in Markdown or HTML'),
      descriptionFormat: z
        .enum(['md', 'html'])
        .default('md')
        .describe('Format of the description content'),
      groupId: groupIdSchema.optional(),
      recipientUserIds: z
        .array(z.number())
        .optional()
        .describe('User IDs to notify about this discussion'),
      recipientEmails: z
        .array(z.string())
        .optional()
        .describe('Email addresses to notify about this discussion'),
      recipientAudience: z
        .string()
        .optional()
        .describe('Set to "group" to notify the entire group'),
      recipientMessage: z
        .string()
        .optional()
        .describe('Message to include in invitation emails')
    })
  )
  .output(
    z.object({
      discussionId: z.number().describe('ID of the created discussion'),
      discussionKey: z.string().describe('Key of the created discussion'),
      title: z.string().describe('Title of the created discussion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let discussion = await client.createDiscussion({
      title: ctx.input.title,
      description: ctx.input.description,
      descriptionFormat: ctx.input.descriptionFormat,
      groupId: ctx.input.groupId,
      recipientUserIds: ctx.input.recipientUserIds,
      recipientEmails: ctx.input.recipientEmails,
      recipientAudience: ctx.input.recipientAudience,
      recipientMessage: ctx.input.recipientMessage
    });

    return {
      output: {
        discussionId: discussion.id,
        discussionKey: discussion.key,
        title: discussion.title
      },
      message: `Created discussion **"${discussion.title}"** (ID: ${discussion.id}).`
    };
  })
  .build();
