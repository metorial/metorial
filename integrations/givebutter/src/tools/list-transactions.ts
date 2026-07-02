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
      scope: z.string().optional().describe('Scope filter (e.g. "beneficiary" or "chapter")')
    })
  )
  .output(
    z.object({
      transactions: z.array(transactionSummarySchema).describe('List of transactions'),
      totalCount: z.number().describe('Total number of transactions'),
      currentPage: z.number().describe('Current page'),
      lastPage: z.number().describe('Last page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTransactions({
      page: ctx.input.page,
      scope: ctx.input.scope
    });

    let transactions = result.data.map((t: any) => ({
      transactionId: String(t.id),
      campaignId: t.campaign_id ?? null,
      firstName: t.first_name ?? null,
      lastName: t.last_name ?? null,
      email: t.email ?? null,
      phone: t.phone ?? null,
      status: t.status ?? null,
      method: t.method ?? null,
      amount: t.amount ?? null,
      fee: t.fee ?? null,
      feeCovered: t.fee_covered ?? null,
      donated: t.donated ?? null,
      payout: t.payout ?? null,
      currency: t.currency ?? null,
      createdAt: t.created_at ?? null
    }));

    return {
      output: {
        transactions,
        totalCount: result.meta.total,
        currentPage: result.meta.current_page,
        lastPage: result.meta.last_page
      },
      message: `Found **${result.meta.total}** transactions (page ${result.meta.current_page} of ${result.meta.last_page}).`
    };
  })
  .build();
