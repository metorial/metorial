import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTransfers = SlateTool.create(spec, {
  name: 'List Transfers',
  key: 'list_transfers',
  description: `Retrieve a list of payout transfers from your Flutterwave account. Supports filtering by date range and status. Can also fetch details for a specific transfer by ID, or check transfer fees and exchange rates for cross-currency transfers.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transferId: z
        .number()
        .optional()
        .describe('Specific transfer ID to retrieve details for'),
      page: z.number().optional().describe('Page number for pagination'),
      status: z.string().optional().describe('Filter by status'),
      from: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      to: z.string().optional().describe('End date (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      transfers: z
        .array(
          z.object({
            transferId: z.number().describe('Transfer ID'),
            accountNumber: z.string().optional().describe('Recipient account number'),
            bankName: z.string().optional().describe('Bank name'),
            fullName: z.string().optional().describe('Recipient name'),
            amount: z.number().describe('Transfer amount'),
            currency: z.string().describe('Transfer currency'),
            fee: z.number().optional().describe('Transfer fee'),
            status: z.string().describe('Transfer status'),
            reference: z.string().optional().describe('Transfer reference'),
            narration: z.string().optional().describe('Transfer description'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of transfers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.transferId) {
      let result = await client.getTransfer(ctx.input.transferId);
      let t = result.data;
      return {
        output: {
          transfers: [
            {
              transferId: t.id,
              accountNumber: t.account_number,
              bankName: t.bank_name,
              fullName: t.full_name,
              amount: t.amount,
              currency: t.currency,
              fee: t.fee,
              status: t.status,
              reference: t.reference,
              narration: t.narration,
              createdAt: t.created_at
            }
          ]
        },
        message: `Transfer **${t.id}** — ${t.currency} ${t.amount} to ${t.full_name || t.account_number}. Status: **${t.status}**.`
      };
    }

    let result = await client.listTransfers({
      page: ctx.input.page,
      status: ctx.input.status,
      from: ctx.input.from,
      to: ctx.input.to
    });

    let transfers = (result.data || []).map((t: any) => ({
      transferId: t.id,
      accountNumber: t.account_number,
      bankName: t.bank_name,
      fullName: t.full_name,
      amount: t.amount,
      currency: t.currency,
      fee: t.fee,
      status: t.status,
      reference: t.reference,
      narration: t.narration,
      createdAt: t.created_at
    }));

    return {
      output: { transfers },
      message: `Found **${transfers.length}** transfers.`
    };
  })
  .build();
