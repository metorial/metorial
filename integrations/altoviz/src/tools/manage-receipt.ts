import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageReceipt = SlateTool.create(spec, {
  name: 'Manage Receipt',
  key: 'manage_receipt',
  description: `Create, update, or delete a receipt in Altoviz. Set **action** to "create", "update", or "delete".`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      receiptId: z
        .number()
        .optional()
        .describe('Altoviz receipt ID (required for update and delete)'),
      date: z.string().optional().describe('Receipt date (YYYY-MM-DD)'),
      amount: z.number().optional(),
      description: z.string().optional(),
      supplierId: z
        .number()
        .optional()
        .describe(
          'Legacy unsupported field: receipts are customer payments; use customerId instead'
        ),
      customerId: z.number().optional().describe('Customer ID from list_customers'),
      customerNumber: z.string().optional(),
      customerInternalId: z.string().optional(),
      internalId: z.string().optional(),
      notes: z
        .string()
        .optional()
        .describe('Receipt notes; takes precedence over description'),
      reference: z.string().optional(),
      paymentMethod: z
        .string()
        .optional()
        .describe('Transfer, Order, Check, Cash, Card, Bill, Usec, or Other'),
      status: z.string().optional().describe('Success, Pending, or Failed'),
      metadata: z.record(z.string(), z.string().nullable()).optional()
    })
  )
  .output(
    z.object({
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Complete provider response, including fields not shown in the summary'),
      receiptId: z.number().optional().describe('Altoviz receipt ID'),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, receiptId, ...data } = ctx.input;

    if (action === 'create') {
      let result = await client.createReceipt(data);
      return {
        output: { receiptId: result.id, raw: result },
        message: `Created receipt (ID: ${result.id}).`
      };
    } else if (action === 'update') {
      if (!receiptId) throw createApiServiceError('receiptId is required for update');
      let result = await client.updateReceipt(receiptId, data);
      return {
        output: { receiptId: result.id, raw: result },
        message: `Updated receipt (ID: ${result.id}).`
      };
    } else {
      if (!receiptId) throw createApiServiceError('receiptId is required for delete');
      await client.deleteReceipt(receiptId);
      return {
        output: { receiptId, deleted: true },
        message: `Deleted receipt with ID **${receiptId}**.`
      };
    }
  })
  .build();
