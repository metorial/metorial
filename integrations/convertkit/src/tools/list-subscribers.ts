import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubscribers = SlateTool.create(spec, {
  name: 'List Subscribers',
  key: 'list_subscribers',
  description: `List and search subscribers in your Kit account. Filter by status, email, date ranges, or retrieve subscribers for a specific tag, form, or sequence.`,
  instructions: [
    'Use the "status" filter to narrow results (e.g. "active", "cancelled", "bounced").',
    'Set "tagId", "formId", or "sequenceId" to list subscribers belonging to that specific resource instead of all subscribers.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['active', 'inactive', 'bounced', 'complained', 'cancelled', 'all'])
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
      sortField: z.string().optional().describe('Field to sort by (e.g. "created_at")'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      tagId: z.number().optional().describe('List subscribers for this specific tag'),
      formId: z.number().optional().describe('List subscribers for this specific form'),
      sequenceId: z
        .number()
        .optional()
        .describe('List subscribers for this specific sequence'),
      perPage: z.number().optional().describe('Number of results per page (max 1000)'),
      cursor: z.string().optional().describe('Pagination cursor for next page')
    })
  )
  .output(
    z.object({
      subscribers: z.array(
        z.object({
          subscriberId: z.number().describe('Subscriber ID'),
          firstName: z.string().nullable().describe('First name'),
          emailAddress: z.string().describe('Email address'),
          state: z.string().describe('Subscriber state'),
          createdAt: z.string().describe('Creation timestamp'),
          fields: z.record(z.string(), z.string().nullable()).describe('Custom field values')
        })
      ),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      nextCursor: z.string().nullable().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    let result: any;

    if (input.tagId) {
      result = await client.listSubscribersForTag(input.tagId, {
        status: input.status,
        perPage: input.perPage,
        after: input.cursor
      });
    } else if (input.formId) {
      result = await client.listSubscribersForForm(input.formId, {
        status: input.status,
        perPage: input.perPage,
        after: input.cursor
      });
    } else if (input.sequenceId) {
      result = await client.listSubscribersForSequence(input.sequenceId, {
        status: input.status,
        perPage: input.perPage,
        after: input.cursor
      });
    } else {
      result = await client.listSubscribers({
        status: input.status,
        emailAddress: input.emailAddress,
        createdAfter: input.createdAfter,
        createdBefore: input.createdBefore,
        updatedAfter: input.updatedAfter,
        updatedBefore: input.updatedBefore,
        sortField: input.sortField,
        sortOrder: input.sortOrder,
        perPage: input.perPage,
        after: input.cursor
      });
    }

    let subscribers = result.subscribers.map((s: any) => ({
      subscriberId: s.id,
      firstName: s.first_name,
      emailAddress: s.email_address,
      state: s.state,
      createdAt: s.created_at,
      fields: s.fields
    }));

    return {
      output: {
        subscribers,
        hasNextPage: result.pagination.has_next_page,
        nextCursor: result.pagination.end_cursor
      },
      message: `Found **${subscribers.length}** subscriber(s)${result.pagination.has_next_page ? ' (more available)' : ''}.`
    };
  });
