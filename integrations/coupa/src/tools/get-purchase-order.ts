import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoupaClient } from '../lib/client';
import { spec } from '../spec';

export let getPurchaseOrder = SlateTool.create(spec, {
  name: 'Get Purchase Order',
  key: 'get_purchase_order',
  description: `Retrieve a single purchase order by its ID, including all header fields, order lines, supplier info, and accounting details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      purchaseOrderId: z.number().describe('Coupa purchase order ID')
    })
  )
  .output(
    z.object({
      purchaseOrderId: z.number().describe('Coupa internal purchase order ID'),
      poNumber: z.string().nullable().optional().describe('PO number'),
      status: z.string().nullable().optional().describe('PO status'),
      version: z.number().nullable().optional().describe('Version number'),
      supplier: z.any().nullable().optional().describe('Supplier object'),
      shipToAddress: z.any().nullable().optional().describe('Ship-to address'),
      currency: z.any().nullable().optional().describe('Currency object'),
      paymentTerms: z.any().nullable().optional().describe('Payment terms'),
      orderLines: z.array(z.any()).nullable().optional().describe('Order line items'),
      totalAmount: z.any().nullable().optional().describe('Total PO amount'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp'),
      createdBy: z.any().nullable().optional().describe('Creator user object'),
      rawData: z.any().optional().describe('Complete raw PO data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoupaClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let po = await client.getPurchaseOrder(ctx.input.purchaseOrderId);

    return {
      output: {
        purchaseOrderId: po.id,
        poNumber: po['po-number'] ?? po.po_number ?? null,
        status: po.status ?? null,
        version: po.version ?? null,
        supplier: po.supplier ?? null,
        shipToAddress: po['ship-to-address'] ?? po.ship_to_address ?? null,
        currency: po.currency ?? null,
        paymentTerms: po['payment-term'] ?? po.payment_term ?? null,
        orderLines: po['order-lines'] ?? po.order_lines ?? null,
        totalAmount: po.total ?? po.total ?? null,
        createdAt: po['created-at'] ?? po.created_at ?? null,
        updatedAt: po['updated-at'] ?? po.updated_at ?? null,
        createdBy: po['created-by'] ?? po.created_by ?? null,
        rawData: po
      },
      message: `Retrieved purchase order **#${po['po-number'] ?? po.po_number ?? po.id}** (status: ${po.status}).`
    };
  })
  .build();
