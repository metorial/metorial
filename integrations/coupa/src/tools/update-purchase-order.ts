import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoupaClient } from '../lib/client';
import { customFields, decimal } from '../lib/contracts';
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
            quantityDecimal: z
              .string()
              .optional()
              .describe(
                'Exact plain decimal quantity; omit the numeric alias for high precision'
              ),
            price: z.number().optional().describe('Updated price'),
            priceDecimal: z
              .string()
              .optional()
              .describe(
                'Exact plain decimal price; omit the numeric alias for high precision'
              ),
            needByDate: z.string().optional().describe('Updated need-by date')
          })
        )
        .optional()
        .describe('Order lines to update — include line ID for existing lines'),
      customFieldsGlobalNamespace: z
        .boolean()
        .optional()
        .describe(
          'Use true for existing global custom fields (legacy default); false places fields under the modern custom-fields namespace'
        ),
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
      rawData: z
        .any()
        .optional()
        .describe('Native data with documented credential fields omitted')
    })
  )
  .handleInvocation(async ctx => {
    let client = CoupaClient.from(ctx);

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
        if (line.quantity !== undefined || line.quantityDecimal !== undefined)
          ol.quantity = decimal(line.quantity, line.quantityDecimal, 'quantity');
        if (line.price !== undefined || line.priceDecimal !== undefined)
          ol.price = decimal(line.price, line.priceDecimal, 'price');
        if (line.needByDate) ol['need-by-date'] = line.needByDate;
        return ol;
      });
    }

    customFields(
      payload,
      ctx.input.customFields,
      ctx.input.customFieldsGlobalNamespace ?? true
    );

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
