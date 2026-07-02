import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { SnapchatClient } from '../lib/client';
import { spec } from '../spec';

let fundingSourceSchema = z.object({
  fundingSourceId: z.string().describe('Unique ID of the funding source'),
  type: z
    .string()
    .optional()
    .describe('Funding source type (e.g., CREDIT_CARD, LINE_OF_CREDIT)'),
  status: z.string().optional().describe('Funding source status'),
  currency: z.string().optional().describe('Currency of the funding source'),
  totalBudgetMicro: z.number().optional().describe('Total budget in micro-currency'),
  availableCreditMicro: z.number().optional().describe('Available credit in micro-currency'),
  cardType: z.string().optional().describe('Card type if applicable'),
  lastFourDigits: z.string().optional().describe('Last four digits of card number'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let getFundingSources = SlateTool.create(spec, {
  name: 'Get Funding Sources',
  key: 'get_funding_sources',
  description: `List all funding sources for a Snapchat organization. Returns payment methods, credit lines, and their available balances.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Organization ID to list funding sources for'),
      limit: z
        .number()
        .int()
        .min(50)
        .max(1000)
        .optional()
        .describe('Maximum number of funding sources to return, from 50 to 1000'),
      cursor: z.string().optional().describe('Pagination cursor from a previous nextLink')
    })
  )
  .output(
    z.object({
      fundingSources: z.array(fundingSourceSchema).describe('List of funding sources'),
      nextLink: z
        .string()
        .optional()
        .describe('Pagination URL for the next page, if available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnapchatClient(ctx.auth.token);
    let result = await client.listFundingSources(
      ctx.input.organizationId,
      ctx.input.limit,
      ctx.input.cursor
    );

    let fundingSources = result.items.map((f: any) => ({
      fundingSourceId: f.id,
      type: f.type,
      status: f.status,
      currency: f.currency,
      totalBudgetMicro: f.total_budget_micro,
      availableCreditMicro: f.available_credit_micro,
      cardType: f.card_type,
      lastFourDigits: f.last_4,
      createdAt: f.created_at,
      updatedAt: f.updated_at
    }));

    return {
      output: { fundingSources, nextLink: result.nextLink },
      message: `Found **${fundingSources.length}** funding source(s).`
    };
  })
  .build();
