import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSettlements = SlateTool.create(spec, {
  name: 'List Settlements',
  key: 'list_settlements',
  description: `Retrieve settlement records showing how collected funds were settled to your bank account. Filter by date range or get details for a specific settlement. Includes gross amount, fees, refunds, chargebacks, and net amount.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      settlementId: z.number().optional().describe('Specific settlement ID to retrieve'),
      page: z.number().optional().describe('Page number for pagination'),
      from: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      to: z.string().optional().describe('End date (YYYY-MM-DD)'),
      subaccountId: z.string().optional().describe('Filter by subaccount ID')
    })
  )
  .output(
    z.object({
      settlements: z
        .array(
          z.object({
            settlementId: z.number().describe('Settlement ID'),
            merchantName: z.string().optional().describe('Merchant/business name'),
            status: z.string().describe('Settlement status'),
            currency: z.string().optional().describe('Settlement currency'),
            grossAmount: z.number().optional().describe('Gross amount before deductions'),
            appFee: z.number().optional().describe('Application fee'),
            merchantFee: z.number().optional().describe('Merchant fee'),
            chargeback: z.number().optional().describe('Chargeback amount'),
            refund: z.number().optional().describe('Refund amount'),
            netAmount: z.number().optional().describe('Net amount settled'),
            transactionCount: z
              .number()
              .optional()
              .describe('Number of transactions in this settlement'),
            transactionDate: z.string().optional().describe('Transaction date'),
            dueDate: z.string().optional().describe('Settlement due date'),
            processedDate: z.string().optional().describe('Date settlement was processed')
          })
        )
        .describe('List of settlements')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.settlementId) {
      let result = await client.getSettlement(ctx.input.settlementId);
      let s = result.data;
      return {
        output: {
          settlements: [
            {
              settlementId: s.id,
              merchantName: s.merchant_name,
              status: s.status,
              currency: s.currency,
              grossAmount: s.gross_amount,
              appFee: s.app_fee,
              merchantFee: s.merchant_fee,
              chargeback: s.chargeback,
              refund: s.refund,
              netAmount: s.net_amount,
              transactionCount: s.transaction_count,
              transactionDate: s.transaction_date,
              dueDate: s.due_date,
              processedDate: s.processed_date
            }
          ]
        },
        message: `Settlement **${s.id}**: ${s.currency} ${s.net_amount} net — Status: **${s.status}**.`
      };
    }

    let result = await client.listSettlements({
      page: ctx.input.page,
      from: ctx.input.from,
      to: ctx.input.to,
      subaccountId: ctx.input.subaccountId
    });

    let settlements = (result.data || []).map((s: any) => ({
      settlementId: s.id,
      merchantName: s.merchant_name,
      status: s.status,
      currency: s.currency,
      grossAmount: s.gross_amount,
      appFee: s.app_fee,
      merchantFee: s.merchant_fee,
      chargeback: s.chargeback,
      refund: s.refund,
      netAmount: s.net_amount,
      transactionCount: s.transaction_count,
      transactionDate: s.transaction_date,
      dueDate: s.due_date,
      processedDate: s.processed_date
    }));

    return {
      output: { settlements },
      message: `Found **${settlements.length}** settlements.`
    };
  })
  .build();
