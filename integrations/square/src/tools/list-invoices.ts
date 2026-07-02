import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `Retrieve a list of invoices for a specific location. Returns invoice summaries including status, amounts, and recipients.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      locationId: z.string().describe('Location ID to list invoices for'),
      cursor: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Maximum number of results')
    })
  )
  .output(
    z.object({
      invoices: z.array(
        z.object({
          invoiceId: z.string().optional(),
          invoiceNumber: z.string().optional(),
          title: z.string().optional(),
          status: z.string().optional(),
          orderId: z.string().optional(),
          locationId: z.string().optional(),
          deliveryMethod: z.string().optional(),
          scheduledAt: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      cursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.listInvoices(ctx.input.locationId, {
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let invoices = result.invoices.map(i => ({
      invoiceId: i.id,
      invoiceNumber: i.invoice_number,
      title: i.title,
      status: i.status,
      orderId: i.order_id,
      locationId: i.location_id,
      deliveryMethod: i.delivery_method,
      scheduledAt: i.scheduled_at,
      createdAt: i.created_at,
      updatedAt: i.updated_at
    }));

    return {
      output: { invoices, cursor: result.cursor },
      message: `Found **${invoices.length}** invoice(s).${result.cursor ? ' More results available.' : ''}`
    };
  })
  .build();
