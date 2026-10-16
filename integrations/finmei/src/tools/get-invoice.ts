import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import {
  FinmeiClient,
  optionalNumber,
  optionalString,
  readEntity,
  requireId
} from '../lib/client';
import { spec } from '../spec';

export let getInvoice = SlateTool.create(spec, {
  key: 'get_invoice',
  name: 'Get Invoice',
  description:
    'Retrieve an invoice, including its buyer, seller, line items, totals, payment options, and sharing link. Use list_invoices to find invoice IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ invoiceId: z.string().describe('Invoice ID from list_invoices') }))
  .output(
    z.object({
      invoiceId: z.string(),
      invoiceNumber: z.string().optional(),
      currency: z.string().optional(),
      total: z.number().optional(),
      paymentStatus: z.string().optional(),
      shareLink: z.string().optional(),
      invoice: z.any()
    })
  )
  .handleInvocation(async ctx => {
    let invoice = readEntity(
      await new FinmeiClient(ctx.auth.token).getInvoice(ctx.input.invoiceId),
      'invoice'
    );
    let invoiceId = requireId(invoice.id, 'invoice ID');
    return {
      output: {
        invoiceId,
        invoice,
        ...pickDefined({
          invoiceNumber:
            invoice.invoice_number === undefined || invoice.invoice_number === null
              ? undefined
              : requireId(invoice.invoice_number, 'invoice number'),
          currency: optionalString(invoice.currency, 'invoice currency'),
          total: optionalNumber(invoice.total_incl_vat, 'invoice total'),
          paymentStatus: optionalString(invoice.payment_status, 'payment status'),
          shareLink: optionalString(invoice.share_link, 'invoice share link')
        })
      },
      message: `Retrieved invoice \`${invoiceId}\`.`
    };
  })
  .build();
