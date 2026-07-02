import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTaxes = SlateTool.create(spec, {
  name: 'List Taxes',
  key: 'list_taxes',
  description: `List tax rates configured in your Elorus organization. Use the returned tax IDs when creating invoices, bills, or product line items.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search by tax percentage.')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of tax rates.'),
      taxes: z.array(z.any()).describe('Array of tax objects.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.listTaxes({
      search: ctx.input.search,
      pageSize: 250
    });

    return {
      output: {
        totalCount: result.count,
        taxes: result.results
      },
      message: `Found **${result.count}** tax rate(s).`
    };
  })
  .build();
