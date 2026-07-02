import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mailerLiteServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageGroupSubscribers = SlateTool.create(spec, {
  name: 'Manage Group Subscribers',
  key: 'manage_group_subscribers',
  description: `Assigns or removes a subscriber from a group, or lists all subscribers in a group. Use this to manage group membership for individual subscribers.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['assign', 'unassign', 'list']).describe('Action to perform'),
      groupId: z.string().describe('Group ID'),
      subscriberId: z
        .string()
        .optional()
        .describe('Subscriber ID (required for assign/unassign)'),
      status: z
        .enum(['active', 'unsubscribed', 'unconfirmed', 'bounced', 'junk'])
        .optional()
        .describe('Filter by status when listing subscribers'),
      limit: z
        .number()
        .optional()
        .describe('Number of subscribers per page (for list action)'),
      cursor: z.string().optional().describe('Pagination cursor (for list action)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      subscribers: z
        .array(
          z.object({
            subscriberId: z.string().describe('Subscriber ID'),
            email: z.string().describe('Email address'),
            status: z.string().describe('Subscriber status')
          })
        )
        .optional()
        .describe('List of subscribers (for list action)'),
      nextCursor: z
        .string()
        .optional()
        .nullable()
        .describe('Cursor for the next page (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'assign') {
      if (!ctx.input.subscriberId)
        throw mailerLiteServiceError('Subscriber ID is required for assign action');
      await client.assignSubscriberToGroup(ctx.input.subscriberId, ctx.input.groupId);
      return {
        output: { success: true },
        message: `Subscriber **${ctx.input.subscriberId}** assigned to group **${ctx.input.groupId}**.`
      };
    }

    if (ctx.input.action === 'unassign') {
      if (!ctx.input.subscriberId)
        throw mailerLiteServiceError('Subscriber ID is required for unassign action');
      await client.unassignSubscriberFromGroup(ctx.input.subscriberId, ctx.input.groupId);
      return {
        output: { success: true },
        message: `Subscriber **${ctx.input.subscriberId}** removed from group **${ctx.input.groupId}**.`
      };
    }

    let result = await client.getGroupSubscribers(ctx.input.groupId, {
      status: ctx.input.status,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let subscribers = (result.data || []).map((s: any) => ({
      subscriberId: s.id,
      email: s.email,
      status: s.status
    }));

    return {
      output: {
        success: true,
        subscribers,
        nextCursor: result.meta?.next_cursor || null
      },
      message: `Retrieved **${subscribers.length}** subscribers from group **${ctx.input.groupId}**.`
    };
  })
  .build();
