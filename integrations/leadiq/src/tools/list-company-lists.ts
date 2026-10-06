import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { companyListSchema } from '../lib/company-list-schemas';
import { spec } from '../spec';

export const listCompanyLists = SlateTool.create(spec, {
  key: 'list_company_lists',
  name: 'List Company Lists',
  description:
    'Discover the current user’s saved company lists and their IDs. Pass nextCursor to retrieve another page; nested company entries have their own cursor.',
  constraints: ['This read does not enrich companies or use credits.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Positive integer page size; provider default is 25.'),
      cursor: z.string().optional().describe('nextCursor from a previous list page')
    })
  )
  .output(z.object({ lists: z.array(companyListSchema), nextCursor: z.string().optional() }))
  .handleInvocation(async ctx => {
    if (
      ctx.input.limit !== undefined &&
      (!Number.isSafeInteger(ctx.input.limit) ||
        ctx.input.limit > 2147483647 ||
        ctx.input.limit < 1)
    )
      throw createApiServiceError('limit must be a positive integer.', {
        reason: 'invalid_input'
      });
    const result = await new Client({ token: ctx.auth.token }).listCompanyLists(
      ctx.input.limit,
      ctx.input.cursor
    );
    const parsed = z
      .object({ items: z.array(companyListSchema), nextCursor: z.string().optional() })
      .safeParse(result);
    if (!parsed.success)
      throw createApiServiceError('LeadIQ returned an invalid company-list page.', {
        reason: 'invalid_api_response'
      });
    return {
      output: { lists: parsed.data.items, nextCursor: parsed.data.nextCursor },
      message: `Returned ${parsed.data.items.length} saved company lists.`
    };
  })
  .build();
