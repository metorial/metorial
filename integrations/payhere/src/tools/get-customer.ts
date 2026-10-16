import { SlateTool } from 'slates';
import { z } from 'zod';
import { PayhereClient } from '../lib/client';
import { spec } from '../spec';

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Fetch detailed information about a specific customer by their ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.number().describe('ID of the customer to retrieve')
    })
  )
  .output(
    z.object({
      raw: z.record(z.string(), z.unknown()).optional().describe('Original provider data'),
      customerId: z.number().describe('Customer identifier'),
      name: z.string().describe('Customer name'),
      email: z.string().describe('Customer email'),
      ipAddress: z.string().nullable().describe('IP address at time of payment'),
      location: z
        .string()
        .nullable()
        .describe('Geographic location; structured provider values are JSON-encoded'),
      locationDetails: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Structured geographic location supplied by Payhere'),
      payments: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Payment history returned for this customer'),
      subscriptions: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Subscriptions returned for this customer'),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayhereClient({ token: ctx.auth.token });

    let customer = await client.getCustomer(ctx.input.customerId);

    return {
      output: customer,
      message: `Customer **${customer.name}** (${customer.email})${customer.location && !customer.locationDetails ? `, located in ${customer.location}` : ''}.`
    };
  })
  .build();
