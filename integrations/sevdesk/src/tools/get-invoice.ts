import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let getInvoice = SlateTool.create(spec, {
  name: 'Get Invoice',
  key: 'get_invoice',
  description: `Retrieve a specific invoice by ID, including its line items/positions. Returns full invoice details with contact info, amounts, dates, and status.`,
  tags: {
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
      invoiceId: z.string().describe('Invoice ID'),
      invoiceNumber: z.string().optional().describe('Invoice number'),
      contactId: z.string().optional().describe('Contact ID'),
      contactName: z.string().optional().describe('Contact name'),
      invoiceDate: z.string().optional().describe('Invoice date'),
      dueDate: z.string().optional().describe('Due date'),
      deliveryDate: z.string().optional().describe('Delivery date'),
      status: z.string().optional().describe('Status code (100=Draft, 200=Open, 1000=Paid)'),
      totalNet: z.string().optional().describe('Net total'),
      totalGross: z.string().optional().describe('Gross total'),
      totalTax: z.string().optional().describe('Total tax'),
      currency: z.string().optional().describe('Currency code'),
      header: z.string().optional(),
      headText: z.string().optional(),
      footText: z.string().optional(),
      positions: z
        .array(
          z.object({
            positionId: z.string(),
            name: z.string().optional(),
            quantity: z.string().optional(),
            price: z.string().optional(),
            taxRate: z.string().optional(),
            totalNet: z.string().optional(),
            totalGross: z.string().optional()
          })
        )
        .optional()
        .describe('Invoice line items'),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });

    let invoice = await client.getInvoice(ctx.input.invoiceId, {
      embed: 'contact'
    });

    let positionsRaw = await client.listInvoicePositions({
      'invoice[id]': ctx.input.invoiceId,
      'invoice[objectName]': 'Invoice'
    });

    let positions = (positionsRaw ?? []).map((p: any) => ({
      positionId: String(p.id),
      name: p.name ?? undefined,
      quantity: p.quantity != null ? String(p.quantity) : undefined,
      price: p.price != null ? String(p.price) : undefined,
      taxRate: p.taxRate != null ? String(p.taxRate) : undefined,
      totalNet: p.sumNet != null ? String(p.sumNet) : undefined,
      totalGross: p.sumGross != null ? String(p.sumGross) : undefined
    }));

    return {
      output: {
        invoiceId: String(invoice.id),
        invoiceNumber: invoice.invoiceNumber ?? undefined,
        contactId: invoice.contact?.id ? String(invoice.contact.id) : undefined,
        contactName: invoice.contact?.name || undefined,
        invoiceDate: invoice.invoiceDate ?? undefined,
        dueDate: invoice.dueDate ?? undefined,
        deliveryDate: invoice.deliveryDate ?? undefined,
        status: invoice.status != null ? String(invoice.status) : undefined,
        totalNet: invoice.sumNet ?? undefined,
        totalGross: invoice.sumGross ?? undefined,
        totalTax: invoice.sumTax ?? undefined,
        currency: invoice.currency ?? undefined,
        header: invoice.header ?? undefined,
        headText: invoice.headText ?? undefined,
        footText: invoice.footText ?? undefined,
        positions: positions.length ? positions : undefined,
        createdAt: invoice.create ?? undefined,
        updatedAt: invoice.update ?? undefined
      },
      message: `Retrieved invoice **${invoice.invoiceNumber ?? invoice.id}** — Status: ${invoice.status}, Gross: ${invoice.sumGross ?? 'N/A'}.`
    };
  })
  .build();
