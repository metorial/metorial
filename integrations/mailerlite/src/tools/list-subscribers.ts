import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubscribers = SlateTool.create(spec, {
  name: 'List Subscribers',
  key: 'list_subscribers',
  description: `Retrieves a paginated list of subscribers. Can filter by subscriber status (active, unsubscribed, unconfirmed, bounced, junk), include group memberships, or request the total subscriber count with limit 0. Use cursor-based pagination to iterate through large lists.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['active', 'unsubscribed', 'unconfirmed', 'bounced', 'junk'])
        .optional()
        .describe('Filter subscribers by status'),
      limit: z
        .number()
        .optional()
        .describe(
          'Number of subscribers to return per page. Use 0 to fetch total count only.'
        ),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      includeGroups: z
        .boolean()
        .optional()
        .describe('Include each subscriber group memberships in the response')
    })
  )
  .output(
    z.object({
      subscribers: z
        .array(
          z.object({
            subscriberId: z.string().describe('Unique subscriber ID'),
            email: z.string().describe('Email address'),
            status: z.string().describe('Subscriber status'),
            fields: z.record(z.string(), z.any()).optional().describe('Custom field values'),
            groups: z
              .array(z.any())
              .optional()
              .describe('Groups included for this subscriber'),
            subscribedAt: z.string().optional().describe('Subscription timestamp'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of subscribers'),
      total: z
        .number()
        .optional()
        .describe('Total subscriber count when returned by MailerLite'),
      nextCursor: z
        .string()
        .optional()
        .nullable()
        .describe('Cursor for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listSubscribers({
      status: ctx.input.status,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      includeGroups: ctx.input.includeGroups
    });

    let subscribers = (result.data || []).map((s: any) => ({
      subscriberId: s.id,
      email: s.email,
      status: s.status,
      fields: s.fields,
      groups: s.groups,
      subscribedAt: s.subscribed_at,
      createdAt: s.created_at
    }));

    return {
      output: {
        subscribers,
        total: result.total ?? result.meta?.total,
        nextCursor: result.meta?.next_cursor || null
      },
      message: `Retrieved **${subscribers.length}** subscribers${ctx.input.status ? ` with status **${ctx.input.status}**` : ''}.`
    };
  })
  .build();
