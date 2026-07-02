import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPaymentsReceived = SlateTool.create(spec, {
  name: 'List Payments Received',
  key: 'list_payments_received',
  description: `List cash receipts (payments received from clients or income). Supports filtering by contact, transaction type, date range, and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Free-text search across title, contact name, and date.'),
      contactId: z.string().optional().describe('Filter by contact ID.'),
      transactionType: z
        .string()
        .optional()
        .describe('Filter by type: "dp" (client payment), "icm" (income).'),
      ordering: z
        .string()
        .optional()
        .describe(
          'Sort field: date, amount, modified, created. Prefix with "-" for descending.'
        ),
      periodFrom: z.string().optional().describe('Filter from date (YYYY-MM-DD).'),
      periodTo: z.string().optional().describe('Filter until date (YYYY-MM-DD).'),
      modifiedAfter: z
        .string()
        .optional()
        .describe('Only return records modified after this date.'),
      page: z.number().optional().describe('Page number (starts at 1).'),
      pageSize: z.number().optional().describe('Results per page (max 250).')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching records.'),
      cashReceipts: z.array(z.any()).describe('Array of cash receipt objects.'),
      hasMore: z.boolean().describe('Whether there are more pages.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.listCashReceipts({
      search: ctx.input.search,
      contact: ctx.input.contactId,
      transactionType: ctx.input.transactionType,
      ordering: ctx.input.ordering,
      periodFrom: ctx.input.periodFrom,
      periodTo: ctx.input.periodTo,
      modifiedAfter: ctx.input.modifiedAfter,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        totalCount: result.count,
        cashReceipts: result.results,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** payment(s) received. Returned ${result.results.length} on this page.`
    };
  })
  .build();
