import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let transactionSummarySchema = z.object({
  transactionId: z.string().describe('Unique identifier of the transaction'),
  campaignId: z.number().nullable().describe('Campaign ID'),
  firstName: z.string().nullable().describe('Donor first name'),
  lastName: z.string().nullable().describe('Donor last name'),
  email: z.string().nullable().describe('Donor email'),
  phone: z.string().nullable().describe('Donor phone'),
  status: z.string().nullable().describe('Transaction status'),
  method: z.string().nullable().describe('Payment method'),
  amount: z.number().nullable().describe('Transaction amount (in cents)'),
  fee: z.number().nullable().describe('Processing fee'),
  feeCovered: z.number().nullable().describe('Fee covered by donor'),
  donated: z.number().nullable().describe('Net donated amount'),
  payout: z.number().nullable().describe('Payout amount'),
  currency: z.string().nullable().describe('Currency code'),
  createdAt: z.string().nullable().describe('When the transaction was created')
});

let listTransactionsOutputSchema = z.object({
  transactions: z.array(transactionSummarySchema).describe('List of transactions'),
  totalCount: z.number().describe('Total number of transactions'),
  currentPage: z.number().describe('Current page'),
  lastPage: z.number().describe('Last page')
});

export let listTransactions = SlateTool.create(spec, {
  name: 'List Transactions',
  key: 'list_transactions',
  description: `Retrieve a paginated list of transactions. Returns transactions made under your account by default. Use the scope parameter for beneficiary or chapter account transactions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      perPage: z.number().optional().describe('Items per page, from 1 to 100'),
      scope: z.string().optional().describe('Scope filter: all, benefiting, or chapters'),
      transactedAfter: z
        .string()
        .optional()
        .describe('Transactions after this ISO 8601 timestamp'),
      transactedBefore: z
        .string()
        .optional()
        .describe('Transactions before this ISO 8601 timestamp'),
      contacts: z.string().optional().describe('Provider contact filter'),
      method: z.string().optional().describe('Payment method filter')
    })
  )
  .output(listTransactionsOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTransactions({
      page: ctx.input.page,
      per_page: ctx.input.perPage,
      scope: ctx.input.scope,
      transactedAfter: ctx.input.transactedAfter,
      transactedBefore: ctx.input.transactedBefore,
      contacts: ctx.input.contacts,
      method: ctx.input.method
    });

    let transactions = result.data.map((t: any) => ({
      transactionId: String(t.id),
      campaignId: t.campaign_id,
      firstName: t.first_name,
      lastName: t.last_name,
      email: t.email,
      phone: t.phone,
      status: t.status,
      method: t.method,
      amount: t.amount,
      fee: t.fee,
      feeCovered: t.fee_covered,
      donated: t.donated,
      payout: t.payout,
      currency: t.currency,
      createdAt: t.created_at
    }));

    return {
      output: client.output(listTransactionsOutputSchema, {
        transactions,
        totalCount: result.meta.total,
        currentPage: result.meta.current_page,
        lastPage: result.meta.last_page
      }),
      message: client.publicData(
        `Found **${result.meta.total}** transactions (page ${result.meta.current_page} of ${result.meta.last_page}).`
      )
    };
  })
  .build();
