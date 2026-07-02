import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getListSubscribers = SlateTool.create(spec, {
  name: 'Get List Subscribers',
  key: 'get_list_subscribers',
  description: `Retrieve subscribers from a specific list. Supports pagination and optional date range filtering.
Returns subscriber emails, custom fields, status, and engagement scores.`,
  constraints: [
    'Maximum page size is 20 items per request.',
    'Date filters must include timezone offset (e.g. 2024-01-01T00:00:00+00:00).'
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
      pageSize: z.number().optional().describe('Number of items per page (max 20)'),
      from: z
        .string()
        .optional()
        .describe(
          'Filter subscribers added from this date (ISO 8601 with timezone, e.g. 2024-01-01T00:00:00+00:00)'
        ),
      to: z
        .string()
        .optional()
        .describe('Filter subscribers added up to this date (ISO 8601 with timezone)')
    })
  )
  .output(
    z.object({
      subscribers: z
        .array(
          z.object({
            email: z.string().describe('Subscriber email address'),
            status: z.string().describe('Subscriber status'),
            score: z.number().describe('Engagement score'),
            fields: z
              .array(
                z.object({
                  name: z.string().describe('Field name'),
                  value: z.string().describe('Field value')
                })
              )
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

    let subscribers = (result.items ?? []).map(s => ({
      email: s.email,
      status: s.status,
      score: s.score,
      fields: s.fields ?? []
    }));

    return {
      output: {
        subscribers,
        totalCount: result.itemsCount,
        currentPage: result.currentPage,
        pagesCount: result.pagesCount
      },
      message: `Found **${result.itemsCount}** subscribers in list \`${ctx.input.listId}\` (page ${result.currentPage} of ${result.pagesCount}).`
    };
  })
  .build();
