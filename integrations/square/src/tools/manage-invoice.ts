import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { squareServiceError } from '../lib/errors';
import { createClient, generateIdempotencyKey } from '../lib/helpers';
import { spec } from '../spec';

export let manageInvoice = SlateTool.create(spec, {
  name: 'Manage Invoice',
  key: 'manage_invoice',
  description:
    'Publish a draft invoice, cancel a published invoice, or delete a draft. Publishing can email the customer or charge a saved card based on settings. Deleting a draft cancels its order.'
})
  .scopes(allOf('INVOICES_READ', 'INVOICES_WRITE', 'ORDERS_WRITE'))
  .input(
    z.object({
      invoiceId: z.string(),
      action: z.enum(['publish', 'cancel', 'delete']),
      version: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe(
          'Current invoice version; required for publish and cancel, recommended for delete'
        ),
      idempotencyKey: z
        .string()
        .min(1)
        .max(128)
        .optional()
        .describe('Unique retry key for publish only')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      invoiceId: z.string().optional(),
      orderId: z.string().optional(),
      status: z.string().optional(),
      version: z.number().optional(),
      publicUrl: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let input = ctx.input;
    let client = createClient(ctx.auth);
    if (input.action === 'publish') {
      if (input.version === undefined)
        throw squareServiceError('version is required to publish an invoice.');
      let invoice = await client.publishInvoice(input.invoiceId, {
        version: input.version,
        idempotencyKey: input.idempotencyKey || generateIdempotencyKey()
      });
      return {
        output: {
          success: true,
          invoiceId: invoice.id,
          orderId: invoice.order_id,
          status: invoice.status,
          version: invoice.version,
          publicUrl: invoice.public_url
        },
        message: `Invoice **${invoice.id}** published with status **${invoice.status}**. Check publicUrl for the payment page.`
      };
    }
    if (input.idempotencyKey)
      throw squareServiceError('idempotencyKey is supported only for publish.');
    if (input.action === 'cancel') {
      if (input.version === undefined)
        throw squareServiceError('version is required to cancel an invoice.');
      let invoice = await client.cancelInvoice(input.invoiceId, input.version);
      return {
        output: {
          success: true,
          invoiceId: invoice.id,
          orderId: invoice.order_id,
          status: invoice.status,
          version: invoice.version,
          publicUrl: invoice.public_url
        },
        message: `Invoice **${invoice.id}** canceled. The customer can no longer pay it.`
      };
    }
    let invoice = await client.getInvoice(input.invoiceId);
    if (invoice.status !== 'DRAFT')
      throw squareServiceError(
        'Only a draft invoice can be deleted. Use cancel for a published invoice.'
      );
    await client.deleteInvoice(input.invoiceId, input.version);
    return {
      output: { success: true, invoiceId: input.invoiceId, orderId: invoice.order_id },
      message: `Draft invoice **${input.invoiceId}** deleted. Its associated order was canceled.`
    };
  })
  .build();
