import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getMailercloudCount, getMailercloudItems } from '../lib/responses';
import { spec } from '../spec';

export let searchLists = SlateTool.create(spec, {
  name: 'Search Lists',
  key: 'search_lists',
  description: `Search and retrieve contact lists from your Mailercloud account. Supports pagination and keyword search to filter lists.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search keyword to filter lists by name'),
      page: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a safe whole number')
        .min(1)
        .optional()
        .describe('Page number for pagination (default: 1)'),
      limit: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a safe whole number')
        .min(10)
        .max(100)
        .optional()
        .describe('Number of lists per page (default: 20)')
    })
  )
  .output(
    z
      .object({
        lists: z
          .array(z.record(z.string(), z.unknown()))
          .describe('List of matching contact lists'),
        totalCount: z.number().optional().describe('Total number of matching lists')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchLists({
      page: ctx.input.page,
      limit: ctx.input.limit,
      search: ctx.input.search
    });

    let data = result?.data ?? result;
    let lists = getMailercloudItems(data?.lists ?? data?.data ?? data);
    let totalCount = getMailercloudCount(result?.count ?? result?.total, lists.length);

    return {
      output: {
        lists,
        totalCount
      },
      message: `Found **${totalCount}** list(s).`
    };
  })
  .build();
