import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { spec } from '../spec';

let mutationSchema = z.object({
  mutationId: z.string(),
  amount: z.string().nullable(),
  code: z.string().nullable(),
  date: z.string().nullable(),
  message: z.string().nullable(),
  contraAccountName: z.string().nullable(),
  contraAccountNumber: z.string().nullable(),
  state: z.string().nullable(),
  currency: z.string().nullable(),
  amountOpen: z.string().nullable(),
  financialAccountId: z.string().nullable(),
  batchReference: z.string().nullable()
});

export let listFinancialMutations = SlateTool.create(spec, {
  name: 'List Financial Mutations',
  key: 'list_financial_mutations',
  description: `List bank transactions (financial mutations) in Moneybird. Filter by period, state (unprocessed/processed), mutation type (debit/credit), or financial account. Useful for reconciliation and reviewing unprocessed transactions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      period: z
        .string()
        .optional()
        .describe(
          'Filter period: "this_month", "prev_month", "this_quarter", "this_year", "prev_year", or custom "YYYYMMDD..YYYYMMDD"'
        ),
      state: z
        .enum(['all', 'unprocessed', 'processed'])
        .optional()
        .describe('Filter by processing state'),
      mutationType: z
        .enum(['all', 'debit', 'credit'])
        .optional()
        .describe('Filter by mutation type'),
      financialAccountId: z.string().optional().describe('Filter by financial account ID'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page (1-100)')
    })
  )
  .output(
    z.object({
      mutations: z.array(mutationSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoneybirdClient({
      token: ctx.auth.token,
      administrationId: ctx.config.administrationId
    });

    let filterParts: string[] = [];
    if (ctx.input.period) filterParts.push(`period:${ctx.input.period}`);
    if (ctx.input.state) filterParts.push(`state:${ctx.input.state}`);
    if (ctx.input.mutationType) filterParts.push(`mutation_type:${ctx.input.mutationType}`);
    if (ctx.input.financialAccountId)
      filterParts.push(`financial_account_id:${ctx.input.financialAccountId}`);

    let mutations = await client.listFinancialMutations({
      filter: filterParts.length > 0 ? filterParts.join(',') : undefined,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let mapped = mutations.map((m: any) => ({
      mutationId: String(m.id),
      amount: m.amount || null,
      code: m.code || null,
      date: m.date || null,
      message: m.message || null,
      contraAccountName: m.contra_account_name || null,
      contraAccountNumber: m.contra_account_number || null,
      state: m.state || null,
      currency: m.currency || null,
      amountOpen: m.amount_open || null,
      financialAccountId: m.financial_account_id ? String(m.financial_account_id) : null,
      batchReference: m.batch_reference || null
    }));

    return {
      output: { mutations: mapped },
      message: `Found ${mapped.length} financial mutation(s)${ctx.input.state ? ` (${ctx.input.state})` : ''}.`
    };
  });
