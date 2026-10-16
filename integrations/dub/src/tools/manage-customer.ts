import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let customerSchema = z
  .object({
    id: z.string(),
    externalId: z.string(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    avatar: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    createdAt: z.string(),
    sales: z.number().nullable().optional(),
    saleAmount: z.number().nullable().optional(),
    stripeCustomerId: z.string().nullable().optional(),
    firstSaleAt: z.string().nullable().optional(),
    subscriptionCanceledAt: z.string().nullable().optional()
  })
  .passthrough();

export let manageCustomer = SlateTool.create(spec, {
  name: 'Manage Customer',
  key: 'manage_customer',
  description:
    'Retrieve, update, or delete a customer by Dub customer ID or an external ID prefixed with ext_. Use List Customers to discover IDs. Deleting a customer removes it from the workspace.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      action: z.enum(['get', 'update', 'delete']).describe('Operation to perform'),
      customerId: z
        .string()
        .min(1)
        .describe('Dub customer ID, or external ID prefixed with ext_'),
      name: z
        .string()
        .nullable()
        .optional()
        .describe('New customer name for update; null clears it'),
      email: z
        .string()
        .email()
        .nullable()
        .optional()
        .describe('New email for update; null clears it'),
      avatar: z
        .string()
        .url()
        .nullable()
        .optional()
        .describe('New avatar URL for update; null clears it'),
      externalId: z.string().optional().describe('New external ID mapping for update'),
      stripeCustomerId: z
        .string()
        .nullable()
        .optional()
        .describe('Stripe customer ID for update; null clears it'),
      country: z
        .string()
        .length(2)
        .optional()
        .describe('ISO 3166-1 alpha-2 country code for update'),
      subscriptionCanceledAt: z
        .string()
        .nullable()
        .optional()
        .describe('Cancellation timestamp for update; null clears it')
    })
  )
  .output(
    z.object({ customer: customerSchema.optional(), deletedCustomerId: z.string().optional() })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { action, customerId, ...fields } = ctx.input;
    if (action === 'get') {
      let customer = await client.getCustomer(customerId);
      return { output: { customer }, message: `Retrieved customer \`${customer.id}\`` };
    }
    if (action === 'delete') {
      let result = await client.deleteCustomer(customerId);
      return {
        output: { deletedCustomerId: result.id },
        message: `Deleted customer \`${result.id}\``
      };
    }
    let changes = pickDefined(fields);
    if (!Object.keys(changes).length)
      throw createApiServiceError('Provide at least one customer property to update.');
    let customer = await client.updateCustomer(customerId, changes);
    return { output: { customer }, message: `Updated customer \`${customer.id}\`` };
  })
  .build();
