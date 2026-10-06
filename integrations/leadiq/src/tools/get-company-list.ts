import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { companyListIdSchema, companyListSchema } from '../lib/company-list-schemas';
import { spec } from '../spec';

export const getCompanyList = SlateTool.create(spec, {
  key: 'get_company_list',
  name: 'Get Company List',
  description:
    'Read a saved company list and a page of its company entries. Discover list IDs with list_company_lists. Entries have distinct saved-entry and data-company IDs.',
  constraints: ['This read does not enrich companies or use credits.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      listId: companyListIdSchema,
      limit: z.number().optional().describe('Positive integer company-entry page size'),
      cursor: z
        .string()
        .optional()
        .describe('companies.nextCursor from the previous entry page')
    })
  )
  .output(z.object({ list: companyListSchema }))
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
    const parsed = companyListSchema.safeParse(
      await new Client({ token: ctx.auth.token }).getCompanyList(
        ctx.input.listId,
        ctx.input.limit,
        ctx.input.cursor
      )
    );
    if (!parsed.success || parsed.data.id !== ctx.input.listId)
      throw createApiServiceError('LeadIQ returned an invalid or mismatched company list.', {
        reason: 'invalid_api_response'
      });
    return {
      output: { list: parsed.data },
      message: `Read company list ${parsed.data.name}.`
    };
  })
  .build();
