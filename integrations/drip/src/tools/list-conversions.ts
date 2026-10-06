import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { accountIdSchema, paging, pagingShape } from '../lib/schemas';
import { spec } from '../spec';

export let listConversions = SlateTool.create(spec, {
  name: 'List Conversions',
  key: 'list_conversions',
  description: `List conversion goals configured in the Drip account. Conversions track specific subscriber actions like URL visits with configurable default values.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: accountIdSchema,
      status: z.enum(['all', 'active', 'disabled']).optional().describe('Conversion status.'),
      sortBy: z.enum(['created_at', 'name']).optional().describe('Sort field.'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction.'),
      page: z
        .number()
        .optional()
        .describe('Legacy page selector; this endpoint does not document pagination.'),
      perPage: z
        .number()
        .optional()
        .describe('Legacy page-size selector; this endpoint does not document pagination.')
    })
  )
  .output(
    z.object({
      conversions: z
        .array(
          z.object({
            conversionId: z.string(),
            name: z.string().optional(),
            url: z.string().optional(),
            defaultValue: z.number().optional(),
            status: z.string().optional(),
            createdAt: z.string().optional()
          })
        )
        .describe('List of conversion goals.'),
      ...pagingShape
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.input.accountId ?? ctx.config.accountId,
      tokenType: ctx.auth.tokenType
    });

    let result = await client.listConversions({
      status: ctx.input.status,
      sortBy: ctx.input.sortBy,
      sortDirection: ctx.input.sortDirection,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let conversions = (result.goals ?? []).map((g: any) => ({
      conversionId: g.id ?? '',
      name: g.name,
      url: g.url,
      defaultValue: g.default_value,
      status: g.status,
      createdAt: g.created_at
    }));

    return {
      output: { conversions, ...paging(result) },
      message: `Found **${conversions.length}** conversion goals.`
    };
  })
  .build();
