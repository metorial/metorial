import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoupaClient } from '../lib/client';
import { spec } from '../spec';

export let updatePurchaseOrder = SlateTool.create(spec, {
  name: 'Update Purchase Order',
  key: 'update_purchase_order',
  description: `Update an existing purchase order in Coupa. Modify header fields such as shipping address, payment terms, or custom fields. Can also update order lines by including them with their IDs.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      purchaseOrderId: z.number().describe('ID of the purchase order to update'),
      shipToAddress: z
        .object({
          addressId: z.number()
        })
        .optional()
        .describe('New ship-to address reference'),
      currency: z
        .object({
          code: z.string()
        })
        .optional()
        .describe('Updated currency'),
      paymentTermCode: z.string().optional().describe('Updated payment term code'),
      orderLines: z
        .array(
          z.object({
            orderLineId: z.number().optional().describe('Existing line ID (for updates)'),
            description: z.string().optional().describe('Line description'),
            quantity: z.number().optional().describe('Updated quantity'),
            price: z.number().optional().describe('Updated price'),
            needByDate: z.string().optional().describe('Updated need-by date')
          })
        )
        .optional()
        .describe('Order lines to update — include line ID for existing lines'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values to update')
    })
  )
  .output(
    z.object({
      purchaseOrderId: z.number().describe('Updated PO ID'),
      poNumber: z.string().nullable().optional().describe('PO number'),
      status: z.string().nullable().optional().describe('Current PO status'),
      rawData: z.any().optional().describe('Complete raw PO data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoupaClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let payload: any = {};

    if (ctx.input.shipToAddress)
      payload['ship-to-address'] = { id: ctx.input.shipToAddress.addressId };
    if (ctx.input.currency) payload.currency = ctx.input.currency;
    if (ctx.input.paymentTermCode)
      payload['payment-term'] = { code: ctx.input.paymentTermCode };

    if (ctx.input.orderLines) {
      payload['order-lines'] = ctx.input.orderLines.map(line => {
        let ol: any = {};
        if (line.orderLineId) ol.id = line.orderLineId;
        if (line.description) ol.description = line.description;
        if (line.quantity !== undefined) ol.quantity = String(line.quantity);
        if (line.price !== undefined) ol.price = String(line.price);
        if (line.needByDate) ol['need-by-date'] = line.needByDate;
        return ol;
      });
    }

    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        payload[key] = value;
      }
    }

    let result = await client.updatePurchaseOrder(ctx.input.purchaseOrderId, payload);

    return {
      output: {
        purchaseOrderId: result.id,
        poNumber: result['po-number'] ?? result.po_number ?? null,
        status: result.status ?? null,
        rawData: result
      },
      message: `Updated purchase order **#${result['po-number'] ?? result.po_number ?? result.id}**.`
    };
  })
  .build();
