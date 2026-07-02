import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

export let listTransactions = SlateTool.create(spec, {
  name: 'List Transactions',
  key: 'list_transactions',
  description: `Retrieve a paginated list of transactions (label purchases). Filter by rate or tracking status. Use this to browse purchased labels and their statuses.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      resultsPerPage: z.number().optional().describe('Number of results per page'),
      rateId: z.string().optional().describe('Filter by rate ID'),
      trackingStatus: z.string().optional().describe('Filter by tracking status')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of transactions'),
      transactions: z.array(
        z.object({
          transactionId: z.string(),
          status: z.string().optional(),
          trackingNumber: z.string().optional(),
          labelUrl: z.string().optional(),
          rate: z.string().optional(),
          createdAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShippoClient(ctx.auth.token);

    let result = await client.listTransactions({
      page: ctx.input.page,
      results: ctx.input.resultsPerPage,
      rate: ctx.input.rateId,
      tracking_status: ctx.input.trackingStatus
    });

    let transactions = result.results.map((t: any) => ({
      transactionId: t.object_id,
      status: t.status,
      trackingNumber: t.tracking_number,
      labelUrl: t.label_url,
      rate: t.rate,
      createdAt: t.object_created
    }));

    return {
      output: {
        totalCount: result.count,
        transactions
      },
      message: `Found **${result.count}** transactions. Showing ${transactions.length} on this page.`
    };
  })
  .build();
