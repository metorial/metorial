import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import { spec } from '../spec';

let transferSummarySchema = z.object({
  transferId: z.string().describe('Transfer ID'),
  status: z.string().describe('Transfer status'),
  type: z.string().describe('Transfer type: debit or credit'),
  amount: z.string().describe('Transfer amount'),
  description: z.string().describe('Transfer description'),
  network: z.string().optional().describe('Transfer network'),
  created: z.string().describe('ISO 8601 creation timestamp')
});

export let listTransfersTool = SlateTool.create(spec, {
  name: 'List Transfers',
  key: 'list_transfers',
  description: `List bank transfers with optional date range filtering and pagination. Returns a summary of each transfer including status, amount, type, and network.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.string().optional().describe('Filter start date (ISO 8601)'),
      endDate: z.string().optional().describe('Filter end date (ISO 8601)'),
      count: z.number().optional().describe('Max number of transfers to return (default 25)'),
      offset: z.number().optional().describe('Pagination offset (default 0)')
    })
  )
  .output(
    z.object({
      transfers: z.array(transferSummarySchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaidClient({
      clientId: ctx.auth.clientId,
      secret: ctx.auth.secret,
      environment: ctx.config.environment
    });

    let result = await client.listTransfers({
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      count: ctx.input.count,
      offset: ctx.input.offset
    });

    let transfers = (result.transfers || []).map((t: any) => ({
      transferId: t.id,
      status: t.status,
      type: t.type,
      amount: t.amount,
      description: t.description,
      network: t.network,
      created: t.created
    }));

    return {
      output: { transfers },
      message: `Retrieved **${transfers.length}** transfer(s).`
    };
  })
  .build();
