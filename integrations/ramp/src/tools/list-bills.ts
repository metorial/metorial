import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBills = SlateTool.create(spec, {
  name: 'List Bills',
  key: 'list_bills',
  description: `Retrieve a paginated list of bills from Ramp. Supports filtering by status, vendor, entity, sync status, payment status, due date range, and invoice number.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      pageSize: z
        .number()
        .min(2)
        .max(100)
        .optional()
        .describe('Number of results per page (2-100)'),
      status: z.string().optional().describe('Filter by bill status summary'),
      vendorId: z.string().optional().describe('Filter by vendor ID'),
      entityId: z.string().optional().describe('Filter by business entity ID'),
      syncStatus: z.string().optional().describe('Filter by sync status'),
      paymentStatus: z.string().optional().describe('Filter by payment status'),
      fromDueDate: z
        .string()
        .optional()
        .describe('Filter bills due after this date (ISO 8601)'),
      toDueDate: z
        .string()
        .optional()
        .describe('Filter bills due before this date (ISO 8601)'),
      invoiceNumber: z.string().optional().describe('Filter by invoice number')
    })
  )
  .output(
    z.object({
      bills: z.array(z.any()).describe('List of bill objects'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.listBills({
      start: ctx.input.cursor,
      pageSize: ctx.input.pageSize,
      status: ctx.input.status,
      vendorId: ctx.input.vendorId,
      entityId: ctx.input.entityId,
      syncStatus: ctx.input.syncStatus,
      paymentStatus: ctx.input.paymentStatus,
      fromDueDate: ctx.input.fromDueDate,
      toDueDate: ctx.input.toDueDate,
      invoiceNumber: ctx.input.invoiceNumber
    });

    return {
      output: {
        bills: result.data,
        nextCursor: result.page?.next
      },
      message: `Retrieved **${result.data.length}** bills${result.page?.next ? ' (more pages available)' : ''}.`
    };
  })
  .build();
