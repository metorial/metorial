import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { harvestAccountIdSchema, resolveHarvestAccountId } from '../lib/account-id';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

let estimateLineItemSchema = z.object({
  lineItemId: z
    .number()
    .optional()
    .describe('Line item ID (required when updating existing items)'),
  kind: z.string().optional().describe('Kind of line item (e.g. "Service", "Product")'),
  description: z.string().optional().describe('Description'),
  quantity: z.number().optional().describe('Quantity'),
  unitPrice: z.number().optional().describe('Unit price'),
  taxed: z.boolean().optional().describe('Whether subject to first tax'),
  taxed2: z.boolean().optional().describe('Whether subject to second tax'),
  destroy: z
    .boolean()
    .optional()
    .describe('Set to true to remove this line item (update only)')
});

export let manageEstimate = SlateTool.create(spec, {
  name: 'Manage Estimate',
  key: 'manage_estimate',
  description: `Create, update, or delete an estimate in Harvest. Estimates include line items and can be sent to clients for approval. Call list_accounts to discover account IDs when choosing between multiple accounts.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      accountId: harvestAccountIdSchema,
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      estimateId: z.number().optional().describe('Estimate ID (required for update/delete)'),
      clientId: z.number().optional().describe('Client ID (required for create)'),
      number: z.string().optional().describe('Estimate number'),
      purchaseOrder: z.string().optional().describe('Purchase order number'),
      tax: z.number().optional().describe('Tax percentage (first)'),
      tax2: z.number().optional().describe('Tax percentage (second)'),
      discount: z.number().optional().describe('Discount percentage'),
      subject: z.string().optional().describe('Estimate subject'),
      notes: z.string().optional().describe('Estimate notes'),
      currency: z.string().optional().describe('Currency code'),
      issueDate: z.string().optional().describe('Issue date (YYYY-MM-DD)'),
      lineItems: z.array(estimateLineItemSchema).optional().describe('Line items')
    })
  )
  .output(
    z.object({
      estimateId: z.number().optional().describe('ID of the estimate'),
      clientName: z.string().optional().describe('Client name'),
      number: z.string().optional().nullable().describe('Estimate number'),
      amount: z.number().optional().describe('Total amount'),
      state: z.string().optional().describe('Estimate state'),
      issueDate: z.string().optional().nullable().describe('Issue date'),
      deleted: z.boolean().optional().describe('Whether the estimate was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HarvestClient({
      token: ctx.auth.token,
      accountId: resolveHarvestAccountId(ctx)
    });

    for (let item of ctx.input.lineItems ?? []) {
      let createsItem =
        ctx.input.action === 'create' ||
        (ctx.input.action === 'update' && item.lineItemId === undefined);
      if (createsItem && (!item.kind || item.unitPrice === undefined)) {
        throw createApiServiceError('New line items require kind and unitPrice.');
      }
      if (
        ctx.input.action === 'create' &&
        (item.lineItemId !== undefined || item.destroy !== undefined)
      ) {
        throw createApiServiceError(
          'lineItemId and destroy are only supported when updating line items.'
        );
      }
      if (ctx.input.action === 'update' && item.destroy && item.lineItemId === undefined) {
        throw createApiServiceError('lineItemId is required to delete an existing line item.');
      }
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.estimateId)
        throw createApiServiceError('estimateId is required for delete');
      await client.deleteEstimate(ctx.input.estimateId);
      return {
        output: { estimateId: ctx.input.estimateId, deleted: true },
        message: `Deleted estimate **#${ctx.input.estimateId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.clientId) throw createApiServiceError('clientId is required for create');
      let createLineItems = ctx.input.lineItems?.map(li => ({
        kind: li.kind ?? '',
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        taxed: li.taxed,
        taxed2: li.taxed2
      }));
      let est = await client.createEstimate({
        clientId: ctx.input.clientId,
        number: ctx.input.number,
        purchaseOrder: ctx.input.purchaseOrder,
        tax: ctx.input.tax,
        tax2: ctx.input.tax2,
        discount: ctx.input.discount,
        subject: ctx.input.subject,
        notes: ctx.input.notes,
        currency: ctx.input.currency,
        issueDate: ctx.input.issueDate,
        lineItems: createLineItems
      });
      return {
        output: {
          estimateId: est.id,
          clientName: est.client?.name,
          number: est.number,
          amount: est.amount,
          state: est.state,
          issueDate: est.issue_date
        },
        message: `Created estimate **#${est.number ?? est.id}** for ${est.amount}.`
      };
    }

    // update
    if (!ctx.input.estimateId)
      throw createApiServiceError('estimateId is required for update');
    let est = await client.updateEstimate(ctx.input.estimateId, {
      clientId: ctx.input.clientId,
      number: ctx.input.number,
      purchaseOrder: ctx.input.purchaseOrder,
      tax: ctx.input.tax,
      tax2: ctx.input.tax2,
      discount: ctx.input.discount,
      subject: ctx.input.subject,
      notes: ctx.input.notes,
      currency: ctx.input.currency,
      issueDate: ctx.input.issueDate,
      lineItems: ctx.input.lineItems
    });
    return {
      output: {
        estimateId: est.id,
        clientName: est.client?.name,
        number: est.number,
        amount: est.amount,
        state: est.state,
        issueDate: est.issue_date
      },
      message: `Updated estimate **#${est.number ?? est.id}** — ${est.amount}.`
    };
  })
  .build();
