import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let dealSchema = z.object({
  dealId: z.number().describe('Deal ID'),
  dealName: z.string().optional().describe('Deal name'),
  value: z.string().optional().describe('Monetary value'),
  valueType: z.string().optional().describe('Billing type'),
  targetDate: z.string().optional().describe('Target date'),
  currentState: z.string().optional().describe('Current state'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let listDeals = SlateTool.create(spec, {
  name: 'List Deals',
  key: 'list_deals',
  description: `List deals (sales opportunities) in CentralStationCRM with pagination. Optionally include related people, companies, or tags.`,
  constraints: ['Maximum 250 results per page.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (starts at 1)'),
      perPage: z.number().optional().describe('Number of results per page (max 250)'),
      includes: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of related data to include (e.g., "people,companies,tags")'
        )
    })
  )
  .output(
    z.object({
      deals: z.array(dealSchema).describe('List of deals'),
      count: z.number().describe('Number of deals returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let result = await client.listDeals({
      page: ctx.input.page,
      perpage: ctx.input.perPage,
      includes: ctx.input.includes
    });

    let items = Array.isArray(result) ? result : [];
    let deals = items.map((item: any) => {
      let deal = item?.deal ?? item;
      return {
        dealId: deal.id,
        dealName: deal.name,
        value: deal.value,
        valueType: deal.value_type,
        targetDate: deal.target_date,
        currentState: deal.current_state,
        createdAt: deal.created_at
      };
    });

    return {
      output: {
        deals,
        count: deals.length
      },
      message: `Found **${deals.length}** deals.`
    };
  })
  .build();
