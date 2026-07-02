import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { customerOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Retrieve a single customer by their internal Chaser ID or external ID. Optionally include computed fields like payment portal link, payer rating, and average days to pay.`,
  instructions: [
    'Use the internal Chaser customer ID directly, or prefix the external ID with "ext_" (e.g. "ext_CUST-001").'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.string().describe('Internal Chaser customer ID or "ext_{externalId}"'),
      includeAdditionalFields: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include payment portal link, payer rating, and average days to pay')
    })
  )
  .output(customerOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCustomer(ctx.input.customerId);

    return {
      output: {
        customerId: result.id || '',
        externalId: result.externalId || '',
        companyName: result.companyName || '',
        contactFirstName: result.contactFirstName ?? null,
        contactLastName: result.contactLastName ?? null,
        contactEmailAddress: result.contactEmailAddress ?? null,
        phoneNumber: result.phoneNumber ?? null,
        mobileNumber: result.mobileNumber ?? null,
        status: result.status,
        groups: result.groups,
        addresses: result.addresses,
        paymentPortalLink: result.paymentPortalLink ?? null,
        payerRating: result.payerRating ?? null,
        payerRatingUpdatedAt: result.payerRatingUpdatedAt ?? null,
        payerRatingNumberInvoicesConsidered:
          result.payerRatingNumberInvoicesConsidered ?? null,
        averageDaysToPay: result.averageDaysToPay ?? null
      },
      message: `Retrieved customer **${result.companyName}** (${result.externalId}).`
    };
  })
  .build();
