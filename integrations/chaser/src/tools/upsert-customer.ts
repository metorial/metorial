import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { customerInputSchema, customerOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

let mapCustomerOutput = (data: any) => ({
  customerId: data.id || '',
  externalId: data.externalId || '',
  companyName: data.companyName || '',
  contactFirstName: data.contactFirstName ?? null,
  contactLastName: data.contactLastName ?? null,
  contactEmailAddress: data.contactEmailAddress ?? null,
  phoneNumber: data.phoneNumber ?? null,
  mobileNumber: data.mobileNumber ?? null,
  status: data.status,
  groups: data.groups,
  addresses: data.addresses,
  paymentPortalLink: data.paymentPortalLink ?? null,
  payerRating: data.payerRating ?? null,
  payerRatingUpdatedAt: data.payerRatingUpdatedAt ?? null,
  payerRatingNumberInvoicesConsidered: data.payerRatingNumberInvoicesConsidered ?? null,
  averageDaysToPay: data.averageDaysToPay ?? null
});

export let upsertCustomer = SlateTool.create(spec, {
  name: 'Create or Update Customer',
  key: 'upsert_customer',
  description: `Create a new customer or update an existing one in Chaser. Provide the customer's external ID and company name along with optional contact details, addresses, and group assignments. If a customer with the given external ID already exists, it will be updated; otherwise a new customer is created.`,
  instructions: [
    'To update an existing customer, provide the customerId (internal Chaser ID) or use the external ID prefixed with "ext_" as the customerId.',
    'When creating a customer, externalId and companyName are required.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z
        .string()
        .optional()
        .describe(
          'Internal Chaser customer ID or "ext_{externalId}" for updates. Omit to create a new customer.'
        ),
      customer: customerInputSchema.describe('Customer data')
    })
  )
  .output(customerOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.customerId) {
      result = await client.updateCustomer(ctx.input.customerId, ctx.input.customer);
    } else {
      result = await client.createCustomer(ctx.input.customer);
    }

    let output = mapCustomerOutput(result);
    let action = ctx.input.customerId ? 'Updated' : 'Created';
    return {
      output,
      message: `${action} customer **${output.companyName}** (${output.externalId}).`
    };
  })
  .build();
