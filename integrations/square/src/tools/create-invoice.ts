import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, generateIdempotencyKey } from '../lib/helpers';
import { spec } from '../spec';
import {
  acceptedPaymentMethodsSchema,
  invoiceOutputSchema,
  mapAcceptedPaymentMethods,
  mapInvoice
} from './invoice-shared';

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description:
    'Create a draft invoice for an existing order. A payment schedule is required; publish separately to make the invoice available to the customer.',
  instructions: [
    'Create the order first with create_order.',
    'Publish the draft with manage_invoice when ready.'
  ],
  tags: { destructive: false }
})
  .scopes(allOf('INVOICES_WRITE', 'ORDERS_WRITE'))
  .input(
    z.object({
      locationId: z.string().describe('Order location ID; discover with list_locations'),
      orderId: z.string().describe('Existing order ID from create_order or get_order'),
      primaryRecipientCustomerId: z
        .string()
        .optional()
        .describe('Recipient customer ID; required before publishing'),
      paymentRequests: z
        .array(z.record(z.string(), z.any()))
        .min(1)
        .describe(
          'One balance request, deposit plus balance, or eligible installments; amounts must total the order'
        ),
      deliveryMethod: z.enum(['EMAIL', 'SHARE_MANUALLY']).optional(),
      invoiceNumber: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      scheduledAt: z.string().optional().describe('RFC 3339 send time'),
      acceptedPaymentMethods: acceptedPaymentMethodsSchema.optional(),
      saleOrServiceDate: z.string().optional().describe('YYYY-MM-DD date'),
      customFields: z
        .array(z.record(z.string(), z.any()))
        .max(2)
        .optional()
        .describe('Complete custom field list; requires Invoices Plus'),
      storePaymentMethodEnabled: z.boolean().optional(),
      idempotencyKey: z
        .string()
        .min(1)
        .max(128)
        .optional()
        .describe('Unique retry key; supply one when retrying an uncertain create request')
    })
  )
  .output(invoiceOutputSchema)
  .handleInvocation(async ctx => {
    let invoice: Record<string, any> = {
      location_id: ctx.input.locationId,
      order_id: ctx.input.orderId,
      payment_requests: ctx.input.paymentRequests,
      delivery_method: ctx.input.deliveryMethod,
      invoice_number: ctx.input.invoiceNumber,
      title: ctx.input.title,
      description: ctx.input.description,
      scheduled_at: ctx.input.scheduledAt,
      sale_or_service_date: ctx.input.saleOrServiceDate,
      custom_fields: ctx.input.customFields,
      store_payment_method_enabled: ctx.input.storePaymentMethodEnabled
    };
    if (ctx.input.primaryRecipientCustomerId)
      invoice.primary_recipient = { customer_id: ctx.input.primaryRecipientCustomerId };
    if (ctx.input.acceptedPaymentMethods)
      invoice.accepted_payment_methods = mapAcceptedPaymentMethods(
        ctx.input.acceptedPaymentMethods
      );
    let created = await createClient(ctx.auth).createInvoice({
      invoice,
      idempotencyKey: ctx.input.idempotencyKey || generateIdempotencyKey()
    });
    return {
      output: mapInvoice(created),
      message: `Invoice **${created.id}** created as a draft. Publishing can send email or charge a saved card depending on its settings.`
    };
  })
  .build();
