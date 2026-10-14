import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { emailListSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listEmailLists = SlateTool.create(spec, {
  name: 'List Email Lists',
  key: 'list_email_lists',
  description: `Retrieve all email lists in your VerifiedEmail account. Returns each list with its name, email count, verification progress, and current status.

Use this to browse existing lists before starting a verification job or fetching results.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      page: z
        .number()
        .min(1)
        .max(Number.MAX_SAFE_INTEGER)
        .refine(Number.isSafeInteger, 'Page number must be a safe whole number')
        .optional()
        .describe('Page number for pagination (starts at 1)'),
      limit: z
        .number()
        .min(1)
        .max(10)
        .refine(Number.isSafeInteger, 'Limit must be a safe whole number')
        .optional()
        .describe('Number of lists per page (1 to 10; default: 10)'),
      offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Number of lists to skip. Overrides page when provided.'),
      sortField: z
        .string()
        .optional()
        .describe('Provider field to sort by (default: dateAdded)'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction (default: desc)')
    })
  )
  .output(
    z.object({
      lists: z.array(emailListSchema).describe('Email lists on this page'),
      total: z.number().describe('Total number of lists available'),
      metadata: z
        .object({
          count: z.number(),
          limit: z.number().int().min(1).max(10).optional(),
          offset: z.number().optional()
        })
        .optional()
        .describe('Provider pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getLists({
      page: ctx.input.page,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sortField: ctx.input.sortField,
      sortOrder: ctx.input.sortOrder
    });

    return {
      output: result,
      message: `Found **${result.total}** email list(s). Returned **${result.lists.length}** list(s) on this page.`
    };
  })
  .build();
