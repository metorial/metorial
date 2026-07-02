import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubscribers = SlateTool.create(spec, {
  name: 'List Subscribers',
  key: 'list_subscribers',
  description: `List subscribers in your Drip account with optional filters for status, tags, and subscription date range. Supports pagination.`,
  constraints: ['Maximum 1000 subscribers per page.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['all', 'active', 'unsubscribed', 'active_or_unsubscribed', 'undeliverable'])
        .optional()
        .describe('Filter by subscriber status. Defaults to active.'),
      tags: z.string().optional().describe('Comma-separated list of tags to filter by.'),
      subscribedBefore: z
        .string()
        .optional()
        .describe('ISO-8601 datetime. Only return subscribers added before this date.'),
      subscribedAfter: z
        .string()
        .optional()
        .describe('ISO-8601 datetime. Only return subscribers added after this date.'),
      page: z.number().optional().describe('Page number for pagination.'),
      perPage: z.number().optional().describe('Number of results per page (max 1000).')
    })
  )
  .output(
    z.object({
      subscribers: z
        .array(
          z.object({
            subscriberId: z.string(),
            email: z.string(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            status: z.string().optional(),
            tags: z.array(z.string()).optional(),
            createdAt: z.string().optional()
          })
        )
        .describe('List of subscribers.'),
      page: z.number().optional().describe('Current page number.'),
      totalPages: z.number().optional().describe('Total number of pages.'),
      totalCount: z
        .number()
        .optional()
        .describe('Total number of subscribers matching the filter.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      tokenType: ctx.auth.tokenType
    });

    let result = await client.listSubscribers({
      status: ctx.input.status,
      tags: ctx.input.tags,
      subscribedBefore: ctx.input.subscribedBefore,
      subscribedAfter: ctx.input.subscribedAfter,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let subscribers = (result.subscribers ?? []).map((sub: any) => ({
      subscriberId: sub.id ?? '',
      email: sub.email ?? '',
      firstName: sub.first_name,
      lastName: sub.last_name,
      status: sub.status,
      tags: sub.tags,
      createdAt: sub.created_at
    }));

    let meta = result.meta ?? {};

    return {
      output: {
        subscribers,
        page: meta.page,
        totalPages: meta.total_pages,
        totalCount: meta.total_count
      },
      message: `Found **${meta.total_count ?? subscribers.length}** subscribers (page ${meta.page ?? 1} of ${meta.total_pages ?? 1}).`
    };
  })
  .build();
