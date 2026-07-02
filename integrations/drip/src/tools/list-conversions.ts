import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      page: z.number().optional().describe('Page number for pagination.'),
      perPage: z.number().optional().describe('Results per page.')
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
        .describe('List of conversion goals.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      tokenType: ctx.auth.tokenType
    });

    let result = await client.listConversions({
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
      output: { conversions },
      message: `Found **${conversions.length}** conversion goals.`
    };
  })
  .build();
