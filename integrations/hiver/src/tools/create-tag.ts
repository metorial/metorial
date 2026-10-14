import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createInboxTag = SlateTool.create(spec, {
  name: 'Create Inbox Tag',
  key: 'create_inbox_tag',
  description:
    'Create a categorization tag in a shared inbox. Call list_inboxes to find the inbox, then use the returned tag ID with update_conversation.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      inboxId: z.string().describe('Inbox ID from list_inboxes'),
      name: z.string().trim().min(1).describe('Name of the new tag'),
      color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional()
        .describe('Optional tag color as a six-digit hex value, such as #64b5f6'),
      description: z
        .string()
        .optional()
        .describe('Optional description of how to use this tag')
    })
  )
  .output(
    z.object({
      tagId: z.string().describe('Created tag ID'),
      name: z.string().optional().describe('Tag name'),
      color: z.string().optional().describe('Tag color'),
      description: z.string().optional().describe('Tag description')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let tag = await client.createInboxTag(ctx.input.inboxId, ctx.input);
    return {
      output: {
        tagId: tag.id,
        name: tag.name,
        color: tag.color,
        description: tag.description
      },
      message: `Created tag **${tag.name ?? tag.id}**.`
    };
  });
