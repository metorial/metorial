import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getInvoice = SlateTool.create(spec, {
  name: 'Get Invoice',
  key: 'get_invoice',
  description: `Retrieve full details of a specific invoice by its ID, including payment requests, recipients, and accepted payment methods.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      invoiceId: z.string().describe('The ID of the invoice to retrieve')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().optional(),
      invoiceNumber: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.string().optional(),
      version: z.number().optional(),
      orderId: z.string().optional(),
      locationId: z.string().optional(),
      primaryRecipient: z.record(z.string(), z.any()).optional(),
      paymentRequests: z.array(z.record(z.string(), z.any())).optional(),
      deliveryMethod: z.string().optional(),
      scheduledAt: z.string().optional(),
      acceptedPaymentMethods: z.record(z.string(), z.any()).optional(),
      saleOrServiceDate: z.string().optional(),
      timezone: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let i = await client.getInvoice(ctx.input.invoiceId);

    return {
      output: {
        invoiceId: i.id,
        invoiceNumber: i.invoice_number,
        title: i.title,
        description: i.description,
        status: i.status,
        version: i.version,
        orderId: i.order_id,
        locationId: i.location_id,
        primaryRecipient: i.primary_recipient,
        paymentRequests: i.payment_requests,
        deliveryMethod: i.delivery_method,
        scheduledAt: i.scheduled_at,
        acceptedPaymentMethods: i.accepted_payment_methods,
        saleOrServiceDate: i.sale_or_service_date,
        timezone: i.timezone,
        createdAt: i.created_at,
        updatedAt: i.updated_at
      },
      message: `Invoice **${i.id}** (#${i.invoice_number || 'N/A'}) — Status: **${i.status}**`
    };
  })
  .build();
