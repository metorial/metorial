import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { PlatformClient } from '../lib/client';
import { spec } from '../spec';

export let getCustomerMessagesTool = SlateTool.create(spec, {
  name: 'Get Customer Messages',
  key: 'get_customer_messages',
  description:
    'Retrieve the full conversation transcript for a customer. Messages have no guaranteed order; sort by message_datetime when chronological order is needed.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      customerId: z.number().describe('Numeric customer ID from list_customers')
    })
  )
  .output(
    z.object({
      customerId: z.number(),
      messages: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Conversation messages including type-specific data, sender display name, and message_datetime'
        )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new PlatformClient(ctx.auth.token).getCustomerMessages(
      ctx.input.customerId
    );
    if (!Array.isArray(result.messages)) {
      throw createApiServiceError('Landbot returned an invalid conversation transcript.');
    }
    return {
      output: { customerId: ctx.input.customerId, messages: result.messages },
      message: `Retrieved **${result.messages.length}** messages for customer **#${ctx.input.customerId}**.`
    };
  });
