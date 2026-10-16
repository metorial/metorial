import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRecord = SlateTool.create(spec, {
  name: 'Get Record',
  key: 'get_record',
  description:
    'Retrieve the complete details of a contact, product, sales invoice, sales quote, sales credit, supplier, or receipt. Use the corresponding list tool to discover record IDs. Includes full line items, relationships, payment and e-invoicing state when the provider returns them.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      resource: z.enum([
        'contact',
        'product',
        'invoice',
        'quote',
        'credit',
        'supplier',
        'receipt'
      ]),
      recordId: z.number().describe('Record ID from the corresponding list tool')
    })
  )
  .output(
    z.object({
      resource: z.enum([
        'contact',
        'product',
        'invoice',
        'quote',
        'credit',
        'supplier',
        'receipt'
      ]),
      recordId: z.number(),
      raw: z.record(z.string(), z.unknown())
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let readers = {
      contact: (id: number) => client.getContact(id),
      product: (id: number) => client.getProduct(id),
      invoice: (id: number) => client.getSaleInvoice(id),
      quote: (id: number) => client.getSaleQuote(id),
      credit: (id: number) => client.getSaleCredit(id),
      supplier: (id: number) => client.getSupplier(id),
      receipt: (id: number) => client.getReceipt(id)
    };
    let record = await readers[ctx.input.resource](ctx.input.recordId);
    return {
      output: { resource: ctx.input.resource, recordId: record.id, raw: record },
      message: `Retrieved ${ctx.input.resource} **${record.number || record.id}**.`
    };
  })
  .build();
