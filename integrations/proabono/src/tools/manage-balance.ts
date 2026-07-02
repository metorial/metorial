import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProAbonoClient } from '../lib/client';
import { spec } from '../spec';

let balanceLineSchema = z.object({
  balanceLineId: z.number().optional().describe('Balance line ID'),
  referenceCustomer: z.string().optional().describe('Customer reference'),
  amount: z.number().optional().describe('Amount in cents (positive=debit, negative=credit)'),
  description: z.string().optional().describe('Line description'),
  dateCreated: z.string().optional().describe('Creation timestamp')
});

export let manageBalance = SlateTool.create(spec, {
  name: 'Manage Balance',
  key: 'manage_balance',
  description: `Add debit or credit lines to a customer's balance and list existing balance lines.
Balance lines represent charges outside standard subscription billing (e.g., consulting hours, one-time fees, credits).
Balance lines appear on the next invoice when the customer is billed.`,
  instructions: [
    'Use "create" to add a balance line — positive amounts are debits, negative are credits.',
    'Use "list" to view existing balance lines for a customer.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'list']).describe('Action to perform'),
      referenceCustomer: z.string().optional().describe('Customer reference'),
      amount: z
        .number()
        .optional()
        .describe('Amount in cents (positive=debit, negative=credit)'),
      description: z.string().optional().describe('Description for the balance line'),
      page: z.number().optional().describe('Page number for list'),
      sizePage: z.number().optional().describe('Items per page for list')
    })
  )
  .output(
    z.object({
      balanceLine: balanceLineSchema.optional().describe('Created balance line'),
      balanceLines: z.array(balanceLineSchema).optional().describe('List of balance lines'),
      totalItems: z.number().optional().describe('Total items for list'),
      page: z.number().optional().describe('Current page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ProAbonoClient({
      token: ctx.auth.token,
      apiEndpoint: ctx.config.apiEndpoint
    });

    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.referenceCustomer) throw new Error('referenceCustomer is required');
      if (ctx.input.amount == null) throw new Error('amount is required');
      let result = await client.createBalanceLine({
        ReferenceCustomer: ctx.input.referenceCustomer,
        Amount: ctx.input.amount,
        Description: ctx.input.description
      });
      let balanceLine = mapBalanceLine(result);
      return {
        output: { balanceLine },
        message: `Created balance line of **${balanceLine.amount} cents** for customer **${ctx.input.referenceCustomer}**${balanceLine.description ? ` — ${balanceLine.description}` : ''}`
      };
    }

    if (action === 'list') {
      let result = await client.listBalanceLines({
        ReferenceCustomer: ctx.input.referenceCustomer,
        Page: ctx.input.page,
        SizePage: ctx.input.sizePage
      });
      let items = result?.Items || [];
      let balanceLines = items.map(mapBalanceLine);
      return {
        output: {
          balanceLines,
          totalItems: result?.TotalItems,
          page: result?.Page
        },
        message: `Found **${balanceLines.length}** balance lines (total: ${result?.TotalItems || 0})`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

let mapBalanceLine = (raw: any) => ({
  balanceLineId: raw?.Id,
  referenceCustomer: raw?.ReferenceCustomer,
  amount: raw?.Amount,
  description: raw?.Description,
  dateCreated: raw?.DateCreated
});
