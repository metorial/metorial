import { SlateTool } from 'slates';
import { z } from 'zod';
import { formatCustomerPayload, RemarketyClient } from '../lib/client';
import { customerSchema } from '../lib/schemas';
import { spec } from '../spec';

export let upsertCustomerTool = SlateTool.create(spec, {
  name: 'Create or Update Customer',
  key: 'upsert_customer',
  description: `Create a new customer or update an existing customer in Remarkety. Sends customer data including contact information, marketing preferences, address, tags, groups, and reward points. If the customer ID already exists, the customer record will be updated; otherwise a new customer is created.`,
  instructions: [
    'The customerId must be consistent across all events for the same customer.',
    'Set acceptsMarketing to null if the preference is unknown.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(customerSchema)
  .output(
    z.object({
      success: z.boolean().describe('Whether the event was sent successfully'),
      eventType: z.string().describe('The event type that was sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RemarketyClient({
      token: ctx.auth.token,
      storeId: ctx.auth.storeId,
      storeDomain: ctx.config.storeDomain,
      platform: ctx.config.platform
    });

    let isCreate = !ctx.input.updatedAt;
    let payload = formatCustomerPayload(ctx.input as unknown as Record<string, unknown>);
    let eventType = isCreate ? 'customers/create' : 'customers/update';

    ctx.info(`Sending ${eventType} event for customer ${ctx.input.email}`);

    await client.createOrUpdateCustomer(payload, isCreate);

    return {
      output: {
        success: true,
        eventType
      },
      message: `Successfully sent **${eventType}** event for customer **${ctx.input.email}** (ID: ${ctx.input.customerId}).`
    };
  })
  .build();
