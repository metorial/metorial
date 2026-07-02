import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, generateIdempotencyKey } from '../lib/helpers';
import { spec } from '../spec';

export let manageInvoice = SlateTool.create(spec, {
  name: 'Manage Invoice',
  key: 'manage_invoice',
  description: `Publish, cancel, or delete an invoice. Publishing sends the invoice to the customer. Canceling stops a published invoice. Deleting permanently removes a draft invoice.`
})
  .input(
    z.object({
      invoiceId: z.string().describe('The ID of the invoice to manage'),
      action: z.enum(['publish', 'cancel', 'delete']).describe('Action to perform'),
      version: z
        .number()
        .describe('Current version of the invoice (required for publish and cancel)'),
      idempotencyKey: z.string().optional()
    })
  )
  .output(
    z.object({
      invoiceId: z.string().optional(),
      status: z.string().optional(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    if (ctx.input.action === 'publish') {
      let i = await client.publishInvoice(ctx.input.invoiceId, {
        version: ctx.input.version,
        idempotencyKey: ctx.input.idempotencyKey || generateIdempotencyKey()
      });
      return {
        output: { invoiceId: i.id, status: i.status, success: true },
        message: `Invoice **${i.id}** published. Status: **${i.status}**`
      };
    }

    if (ctx.input.action === 'cancel') {
      let i = await client.cancelInvoice(ctx.input.invoiceId, ctx.input.version);
      return {
        output: { invoiceId: i.id, status: i.status, success: true },
        message: `Invoice **${i.id}** canceled. Status: **${i.status}**`
      };
    }

    await client.deleteInvoice(ctx.input.invoiceId, ctx.input.version);
    return {
      output: { invoiceId: ctx.input.invoiceId, status: 'DELETED', success: true },
      message: `Invoice **${ctx.input.invoiceId}** deleted.`
    };
  })
  .build();
