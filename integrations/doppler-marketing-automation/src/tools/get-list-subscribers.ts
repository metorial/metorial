import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, rawSchema } from '../lib/client';
import { spec } from '../spec';

export let getListSubscribers = SlateTool.create(spec, {
  name: 'Get List Subscribers',
  key: 'get_list_subscribers',
  description: `Retrieve subscribers from a specific list. Supports pagination. Date filters are not supported by this endpoint.
Returns subscriber emails, custom fields, status, and engagement scores.`,
  constraints: [
    'Maximum page size is 100 items per request.',
    'Date filters are unsupported on this endpoint; use get_subscribers with updatedAfter.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.number().describe('ID of the list to retrieve subscribers from'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of items per page (max 100)'),
      from: z
        .string()
        .optional()
        .describe(
          'Legacy date filter. This endpoint does not support date filtering; omit this field and use get_subscribers with updatedAfter instead.'
        ),
      to: z
        .string()
        .optional()
        .describe(
          'Legacy date filter. This endpoint does not support date filtering; omit this field.'
        )
    })
  )
  .output(
    z.object({
      raw: rawSchema
        .optional()
        .describe('Original provider response, with credentials removed'),
      subscribers: z
        .array(
          z.object({
            email: z.string().describe('Subscriber email address'),
            status: z.string().optional().describe('Subscriber status'),
            score: z.number().optional().describe('Engagement score'),
            fields: z
              .array(
                z.object({
                  name: z.string().describe('Field name'),
                  value: z.string().optional().describe('Field value')
                })
              )
              .optional()
              .describe('Custom field values')
          })
        )
        .describe('Array of subscribers'),
      totalCount: z.number().describe('Total number of subscribers matching the criteria'),
      currentPage: z.number().optional().describe('Current page number'),
      pagesCount: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.config.accountEmail
    });

    let result = await client.getListSubscribers(ctx.input.listId, {
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      from: ctx.input.from,
      to: ctx.input.to
    });

    let subscribers = result.items.map(s => ({
      email: s.email,
      status: s.status,
      score: s.score,
      fields: s.fields
    }));

    return {
      output: {
        raw: result.raw,
        subscribers,
        totalCount: result.itemsCount,
        currentPage: result.currentPage,
        pagesCount: result.pagesCount
      },
      message: `Found **${result.itemsCount}** subscribers in list \`${ctx.input.listId}\` (page ${result.currentPage} of ${result.pagesCount}).`
    };
  })
  .build();
