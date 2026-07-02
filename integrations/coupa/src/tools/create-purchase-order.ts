import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoupaClient } from '../lib/client';
import { spec } from '../spec';

let orderLineInputSchema = z
  .object({
    description: z.string().describe('Description of the line item'),
    lineNumber: z.number().optional().describe('Line number'),
    quantity: z.number().describe('Quantity to order'),
    price: z.number().describe('Unit price'),
    currency: z.object({ code: z.string() }).optional().describe('Currency for this line'),
    needByDate: z.string().optional().describe('Need-by date (ISO 8601)'),
    accountingTotal: z.number().optional().describe('Total accounting amount'),
    uom: z.object({ code: z.string() }).optional().describe('Unit of measure'),
    commodity: z.object({ name: z.string() }).optional().describe('Commodity'),
    account: z.any().optional().describe('Account object for this line')
  })
  .describe('Order line item');

export let createPurchaseOrder = SlateTool.create(spec, {
  name: 'Create Purchase Order',
  key: 'create_purchase_order',
  description: `Create a new purchase order in Coupa with header information and order lines. Requires a supplier and at least one order line with description, quantity, and price.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      supplier: z
        .object({
          supplierId: z.number().optional().describe('Supplier ID'),
          supplierNumber: z.string().optional().describe('Supplier number')
        })
        .describe('Supplier reference — provide either supplierId or supplierNumber'),
      shipToAddress: z
        .object({
          addressId: z.number().optional().describe('Address ID')
        })
        .optional()
        .describe('Ship-to address reference'),
      currency: z
        .object({
          code: z.string()
        })
        .optional()
        .describe('Currency for the PO'),
      paymentTermCode: z.string().optional().describe('Payment term code'),
      poNumber: z.string().optional().describe('Custom PO number (if not auto-generated)'),
      orderLines: z
        .array(orderLineInputSchema)
        .min(1)
        .describe('Order lines (at least one required)'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values')
    })
  )
  .output(
    z.object({
      purchaseOrderId: z.number().describe('Created PO ID'),
      poNumber: z.string().nullable().optional().describe('PO number'),
      status: z.string().nullable().optional().describe('PO status after creation'),
      rawData: z.any().optional().describe('Complete raw PO data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoupaClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let supplierRef: any = {};
    if (ctx.input.supplier.supplierId) {
      supplierRef.id = ctx.input.supplier.supplierId;
    } else if (ctx.input.supplier.supplierNumber) {
      supplierRef.number = ctx.input.supplier.supplierNumber;
    }

    let payload: any = {
      supplier: supplierRef,
      'order-lines': ctx.input.orderLines.map((line, idx) => {
        let ol: any = {
          description: line.description,
          'line-num': line.lineNumber ?? idx + 1,
          quantity: String(line.quantity),
          price: String(line.price)
        };
        if (line.currency) ol.currency = line.currency;
        if (line.needByDate) ol['need-by-date'] = line.needByDate;
        if (line.uom) ol.uom = line.uom;
        if (line.commodity) ol.commodity = line.commodity;
        if (line.account) ol.account = line.account;
        return ol;
      })
    };

    if (ctx.input.shipToAddress)
      payload['ship-to-address'] = { id: ctx.input.shipToAddress.addressId };
    if (ctx.input.currency) payload.currency = ctx.input.currency;
    if (ctx.input.paymentTermCode)
      payload['payment-term'] = { code: ctx.input.paymentTermCode };
    if (ctx.input.poNumber) payload['po-number'] = ctx.input.poNumber;
    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        payload[key] = value;
      }
    }

    let result = await client.createPurchaseOrder(payload);

    return {
      output: {
        purchaseOrderId: result.id,
        poNumber: result['po-number'] ?? result.po_number ?? null,
        status: result.status ?? null,
        rawData: result
      },
      message: `Created purchase order **#${result['po-number'] ?? result.po_number ?? result.id}** (status: ${result.status}).`
    };
  })
  .build();
