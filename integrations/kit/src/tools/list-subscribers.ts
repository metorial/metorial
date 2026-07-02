import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubscribers = SlateTool.create(spec, {
  name: 'List Subscribers',
  key: 'list_subscribers',
  description: `Search and list email subscribers with filtering by status, email address, and date ranges. Supports cursor-based pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['active', 'inactive', 'bounced', 'complained', 'cancelled'])
        .optional()
        .describe('Filter by subscriber status'),
      emailAddress: z.string().optional().describe('Filter by exact email address'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter subscribers created after this ISO 8601 date'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter subscribers created before this ISO 8601 date'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter subscribers updated after this ISO 8601 date'),
      updatedBefore: z
        .string()
        .optional()
        .describe('Filter subscribers updated before this ISO 8601 date'),
      sortField: z
        .enum(['id', 'updated_at', 'cancelled_at'])
        .optional()
        .describe('Field to sort results by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      perPage: z.number().optional().describe('Number of results per page (max 100)'),
      afterCursor: z.string().optional().describe('Pagination cursor to fetch next page'),
      beforeCursor: z.string().optional().describe('Pagination cursor to fetch previous page')
    })
  )
  .output(
    z.object({
      subscribers: z.array(
        z.object({
          subscriberId: z.number().describe('Unique subscriber ID'),
          emailAddress: z.string().describe('Subscriber email address'),
          firstName: z.string().nullable().describe('Subscriber first name'),
          state: z.string().describe('Subscriber state (active, inactive, etc.)'),
          createdAt: z.string().describe('When the subscriber was created'),
          fields: z.record(z.string(), z.string().nullable()).describe('Custom field values')
        })
      ),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      endCursor: z.string().nullable().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listSubscribers({
      status: ctx.input.status,
      emailAddress: ctx.input.emailAddress,
      createdAfter: ctx.input.createdAfter,
      createdBefore: ctx.input.createdBefore,
      updatedAfter: ctx.input.updatedAfter,
      updatedBefore: ctx.input.updatedBefore,
      sortField: ctx.input.sortField,
      sortOrder: ctx.input.sortOrder,
      perPage: ctx.input.perPage,
      after: ctx.input.afterCursor,
      before: ctx.input.beforeCursor
    });

    let subscribers = result.data.map(s => ({
      subscriberId: s.id,
      emailAddress: s.email_address,
      firstName: s.first_name,
      state: s.state,
      createdAt: s.created_at,
      fields: s.fields
    }));

    return {
      output: {
        subscribers,
        hasNextPage: result.pagination.has_next_page,
        endCursor: result.pagination.end_cursor
      },
      message: `Found **${subscribers.length}** subscribers.${result.pagination.has_next_page ? ' More results available.' : ''}`
    };
  })
  .build();
