import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { squareServiceError } from '../lib/errors';
import { createClient, generateIdempotencyKey } from '../lib/helpers';
import { spec } from '../spec';
import {
  acceptedPaymentMethodsSchema,
  invoiceOutputSchema,
  mapAcceptedPaymentMethods,
  mapInvoice
} from './invoice-shared';

export let updateInvoice = SlateTool.create(spec, {
  name: 'Update Invoice',
  key: 'update_invoice',
  description:
    'Update sparse invoice fields using the current version. Updating a published invoice can notify its customer. Use null or payment-request remove markers to clear supported values.',
  tags: { destructive: false }
})
  .scopes(allOf('INVOICES_WRITE', 'ORDERS_WRITE'))
  .input(
    z.object({
      invoiceId: z.string(),
      version: z
        .number()
        .int()
        .nonnegative()
        .describe('Current invoice version from get_invoice'),
      invoiceNumber: z.string().nullable().optional(),
      title: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      primaryRecipientCustomerId: z
        .string()
        .nullable()
        .optional()
        .describe(
          'Draft invoices only. To refresh recipient contact details, clear this field in one update, then set it in another'
        ),
      paymentRequests: z
        .array(z.record(z.string(), z.any()))
        .nullable()
        .optional()
        .describe('Sparse requests by uid; use {uid, remove:true} to remove a request'),
      deliveryMethod: z.enum(['EMAIL', 'SHARE_MANUALLY']).nullable().optional(),
      scheduledAt: z.string().nullable().optional(),
      acceptedPaymentMethods: acceptedPaymentMethodsSchema.nullable().optional(),
      saleOrServiceDate: z.string().nullable().optional(),
      customFields: z
        .array(z.record(z.string(), z.any()))
        .max(2)
        .nullable()
        .optional()
        .describe('Complete custom field list; requires Invoices Plus'),
      storePaymentMethodEnabled: z.boolean().nullable().optional(),
      fieldsToClear: z
        .array(z.string())
        .optional()
        .describe('Square paths to clear; do not combine with null on the same field'),
      idempotencyKey: z.string().min(1).max(128).optional()
    })
  )
  .output(invoiceOutputSchema)
  .handleInvocation(async ctx => {
    let input = ctx.input;
    let fields: Record<string, any> = {
      invoice_number: input.invoiceNumber,
      title: input.title,
      description: input.description,
      payment_requests: input.paymentRequests,
      delivery_method: input.deliveryMethod,
      scheduled_at: input.scheduledAt,
      sale_or_service_date: input.saleOrServiceDate,
      custom_fields: input.customFields,
      store_payment_method_enabled: input.storePaymentMethodEnabled,
      accepted_payment_methods:
        input.acceptedPaymentMethods === null
          ? null
          : input.acceptedPaymentMethods
            ? mapAcceptedPaymentMethods(input.acceptedPaymentMethods)
            : undefined,
      primary_recipient:
        input.primaryRecipientCustomerId === null
          ? null
          : input.primaryRecipientCustomerId
            ? { customer_id: input.primaryRecipientCustomerId }
            : undefined
    };
    let specified = Object.entries(fields).filter(([, value]) => value !== undefined);
    if (!specified.length && !input.fieldsToClear?.length)
      throw squareServiceError(
        'Provide at least one invoice field or fieldsToClear path to update.'
      );
    if (input.fieldsToClear?.length && specified.some(([, value]) => value === null)) {
      throw squareServiceError(
        'Use either null values or fieldsToClear in one invoice update, not both.'
      );
    }
    let updated = await createClient(ctx.auth).updateInvoice(input.invoiceId, {
      invoice: { version: input.version, ...Object.fromEntries(specified) },
      fieldsToClear: input.fieldsToClear,
      idempotencyKey: input.idempotencyKey || generateIdempotencyKey()
    });
    return {
      output: mapInvoice(updated),
      message: `Invoice **${updated.id}** updated to version **${updated.version}**.`
    };
  })
  .build();
