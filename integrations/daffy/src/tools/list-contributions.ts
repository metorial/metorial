import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContributions = SlateTool.create(spec, {
  name: 'List Contributions',
  key: 'list_contributions',
  description: `Retrieve your fund contribution history. Each contribution includes the amount, payment type, status, currency, and timestamps. Contributions represent money deposited into your Daffy fund via bank transfers, credit cards, crypto, stock, checks, wires, or DAF transfers.`,
  constraints: ['Contributions are private and only accessible for your own fund.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z
        .number()
        .optional()
        .describe('Page number for pagination (defaults to first page)')
    })
  )
  .output(
    z.object({
      contributions: z
        .array(
          z.object({
            contributionId: z.number().describe('Unique contribution identifier'),
            units: z.number().describe('Number of units contributed'),
            type: z
              .string()
              .describe(
                'Payment type (e.g., bank_account_scheduled_deposit, credit_card_scheduled_deposit, crypto_payment, stock_payment)'
              ),
            status: z
              .string()
              .describe('Status (pending, success, waiting_for_funds, failed)'),
            valuation: z.number().describe('Unit price in USD'),
            currency: z.string().describe('Currency or asset type'),
            createdAt: z.string().describe('Creation timestamp'),
            receivedAt: z.string().describe('Receipt timestamp'),
            completedAt: z.string().describe('Completion timestamp')
          })
        )
        .describe('List of contributions'),
      totalCount: z.number().describe('Total number of contributions'),
      currentPage: z.number().describe('Current page number'),
      lastPage: z.number().describe('Last available page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getContributions(ctx.input.page);

    return {
      output: {
        contributions: result.items.map(c => ({
          contributionId: c.id,
          units: c.units,
          type: c.type,
          status: c.status,
          valuation: c.valuation,
          currency: c.currency,
          createdAt: c.created_at,
          receivedAt: c.received_at,
          completedAt: c.completed_at
        })),
        totalCount: result.meta.count,
        currentPage: result.meta.page,
        lastPage: result.meta.last
      },
      message: `Found **${result.meta.count}** contribution(s). Showing page ${result.meta.page} of ${result.meta.last}.`
    };
  })
  .build();
