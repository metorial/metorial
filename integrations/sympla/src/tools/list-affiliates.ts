import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let affiliateSchema = z.object({
  affiliateId: z.number().describe('Unique affiliate identifier'),
  name: z.string().describe('Affiliate name'),
  email: z.string().describe('Affiliate email'),
  commission: z.number().describe('Commission percentage'),
  hasLimit: z.boolean().describe('Whether the affiliate has a sales limit'),
  limit: z.number().describe('Maximum number of sales allowed'),
  sales: z.number().describe('Number of sales made')
});

export let listAffiliatesTool = SlateTool.create(spec, {
  name: 'List Affiliates',
  key: 'list_affiliates',
  description: `Retrieve the list of affiliates associated with a specific event, including their commission rates and sales performance.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.number().describe('Event ID to list affiliates for')
    })
  )
  .output(
    z.object({
      affiliates: z.array(affiliateSchema).describe('List of affiliates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.listAffiliates(ctx.input.eventId);

    let affiliates = (result.data || []).map(a => ({
      affiliateId: a.id ?? 0,
      name: a.name ?? '',
      email: a.email ?? '',
      commission: a.commission ?? 0,
      hasLimit: a.has_limit ?? false,
      limit: a.limit ?? 0,
      sales: a.sales ?? 0
    }));

    return {
      output: {
        affiliates
      },
      message: `Found **${affiliates.length}** affiliates for event ${ctx.input.eventId}.`
    };
  })
  .build();
