import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateConversation = SlateTool.create(spec, {
  name: 'Update Conversation',
  key: 'update_conversation',
  description: `Update an existing conversation's status, assignee, tags, channel, or custom fields. Use this to reassign, resolve, reopen, tag, or move conversations.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      conversationSlug: z
        .string()
        .describe('The unique slug identifier of the conversation to update'),
      status: z
        .number()
        .optional()
        .describe('New status: 0=Open, 1=Responded, 2=Done, 3=Spam, 4=Archived, 5=On Hold'),
      assigneeEmail: z
        .string()
        .optional()
        .describe('Email of the staff member to reassign to'),
      tagList: z
        .array(z.string())
        .optional()
        .describe('Updated list of tags (replaces existing tags)'),
      channelSlug: z
        .string()
        .optional()
        .describe('Move conversation to a different channel by slug'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field key-value pairs to update'),
      holdUntil: z
        .string()
        .optional()
        .describe('ISO 8601 datetime for when On Hold status should expire'),
      brandUrl: z
        .string()
        .optional()
        .describe('Destination brand URL to move conversation to another brand')
    })
  )
  .output(
    z.object({
      slug: z.string().describe('Conversation slug'),
      subject: z.string().nullable().describe('Conversation subject'),
      status: z.number().describe('Updated status code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.updateConversation(ctx.input.conversationSlug, {
      status: ctx.input.status,
      assignee: ctx.input.assigneeEmail,
      tagList: ctx.input.tagList,
      category: ctx.input.channelSlug,
      data: ctx.input.customFields,
      holdUntil: ctx.input.holdUntil,
      brand: ctx.input.brandUrl
    });

    let c = result.conversation || result;

    return {
      output: {
        slug: c.slug,
        subject: c.subject,
        status: c.status
      },
      message: `Updated conversation **${c.subject || c.slug}**.`
    };
  })
  .build();
