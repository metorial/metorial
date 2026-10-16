import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, rawSchema } from '../lib/client';
import { spec } from '../spec';

export let getSubscribers = SlateTool.create(spec, {
  key: 'get_subscribers',
  name: 'Get Account Subscribers',
  description:
    'List or search subscribers across the account, with an optional updatedAfter filter. Returns the original subscriber data and pagination metadata.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      keyword: z.string().optional().describe('Search keyword'),
      updatedAfter: z
        .string()
        .optional()
        .describe(
          'Only subscribers updated after this ISO 8601 date and time, including timezone'
        ),
      page: z.number().optional().describe('Page number, starting at 1'),
      pageSize: z.number().optional().describe('Number of subscribers per page, up to 100'),
      resumeFrom: z
        .number()
        .optional()
        .describe('Provider continuation identifier when resuming a subscriber export')
    })
  )
  .output(
    z.object({
      subscribers: z.array(rawSchema),
      totalCount: z.number(),
      currentPage: z.number(),
      pagesCount: z.number(),
      raw: rawSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, accountEmail: ctx.config.accountEmail });
    let result = await client.getSubscribers(ctx.input);
    return {
      output: {
        subscribers: result.items,
        totalCount: result.itemsCount,
        currentPage: result.currentPage,
        pagesCount: result.pagesCount,
        raw: result.raw
      },
      message: `Retrieved ${result.items.length} subscribers.`
    };
  })
  .build();
