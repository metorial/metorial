import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  conversationStatusDescription,
  validateConversationStatus,
  validateHoldUntil
} from '../lib/conversations';
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
      status: z.number().optional().describe(conversationStatusDescription),
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
        .describe('Move conversation to a different email channel by slug'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field key-value pairs to update'),
      holdUntil: z
        .string()
        .optional()
        .describe(
          'ISO 8601 timestamp with a timezone for when On Hold expires; use with status 5 or an already on-hold conversation'
        ),
      brandUrl: z
        .string()
        .optional()
        .describe(
          'Destination brand URL when moving to an email channel in another brand; requires channelSlug'
        )
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
    validateConversationStatus(ctx.input.status);
    validateHoldUntil(ctx.input.status, ctx.input.holdUntil);
    for (let [field, value] of Object.entries({
      assigneeEmail: ctx.input.assigneeEmail,
      channelSlug: ctx.input.channelSlug,
      brandUrl: ctx.input.brandUrl
    })) {
      if (value !== undefined && !value.trim()) {
        throw createApiServiceError(
          `Provide a nonempty ${field} when updating a conversation.`
        );
      }
    }
    if (
      ctx.input.status === undefined &&
      ctx.input.assigneeEmail === undefined &&
      ctx.input.tagList === undefined &&
      ctx.input.channelSlug === undefined &&
      ctx.input.customFields === undefined &&
      ctx.input.holdUntil === undefined &&
      ctx.input.brandUrl === undefined
    ) {
      throw createApiServiceError('Provide at least one conversation field to update.');
    }
    if (ctx.input.brandUrl !== undefined && !ctx.input.channelSlug) {
      throw createApiServiceError(
        'Provide channelSlug for the destination email channel when moving a conversation to another brand.'
      );
    }

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
