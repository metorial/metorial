import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let invoiceItemSchema = z.object({
  itemId: z.number().optional().describe('Line item ID'),
  sku: z.string().optional().describe('Product SKU code'),
  quantity: z.number().optional().describe('Quantity ordered'),
  price: z.string().optional().describe('Unit price in USD'),
  audiofileId: z.number().optional().describe('Associated audiofile ID'),
  total: z.string().optional().describe('Line item total in USD')
});

export let getInvoice = SlateTool.create(spec, {
  name: 'Get Invoice',
  key: 'get_invoice',
  description: `Retrieve detailed invoice information including line items with SKUs, quantities, prices, associated audiofiles, and payment timestamps.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      invoiceId: z.string().describe('ID of the invoice to retrieve')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().optional().describe('Invoice ID'),
      purchaseOrder: z.string().optional().describe('Purchase order reference'),
      createdAt: z.string().optional().describe('Invoice creation timestamp'),
      paidAt: z.string().optional().describe('Payment timestamp'),
      total: z.string().optional().describe('Invoice total in USD'),
      items: z.array(invoiceItemSchema).optional().describe('Line items on the invoice'),
      state: z.string().optional().describe('Invoice payment or preparation state'),
      raw: z.unknown().describe('Provider response with credentials removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let { result, raw } = await client.getInvoice(ctx.input.invoiceId);

    let items = result.items?.map(item => ({
      itemId: item.id,
      sku: item.sku,
      quantity: item.quantity,
      price: item.price,
      audiofileId: item.audiofile,
      total: item.total
    }));

    let output = {
      invoiceId: result.id?.toString(),
      purchaseOrder: result.purchase_order,
      createdAt: result.createtime,
      paidAt: result.paidtime,
      total: result.total,
      items,
      state: result.state,
      raw
    };

    return {
      output,
      message: `Invoice **${output.invoiceId}** — total: **$${output.total ?? 'N/A'}**, ${items ? `${items.length} line item(s)` : 'line items were not returned'}.`
    };
  })
  .build();
