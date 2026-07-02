import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendloopClient } from '../lib/client';
import { spec } from '../spec';

export let updateSubscriber = SlateTool.create(spec, {
  name: 'Update Subscriber',
  key: 'update_subscriber',
  description: `Update a subscriber's custom field values within a specific list. Identify the subscriber by their ID or email address and provide the custom fields to update as a map of field IDs to new values.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the subscriber list'),
      subscriberId: z.string().optional().describe('ID of the subscriber to update'),
      emailAddress: z
        .string()
        .optional()
        .describe('Email address of the subscriber to update (alternative to subscriberId)'),
      fields: z
        .record(z.string(), z.string())
        .describe(
          'Custom field values to update as a map of field ID to value (e.g., {"11": "Jane", "12": "Smith"})'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendloopClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    if (!ctx.input.subscriberId && !ctx.input.emailAddress) {
      throw new Error('Either subscriberId or emailAddress must be provided');
    }

    await client.updateSubscriber(ctx.input.listId, {
      subscriberId: ctx.input.subscriberId,
      emailAddress: ctx.input.emailAddress,
      fields: ctx.input.fields
    });

    return {
      output: { success: true },
      message: `Successfully updated subscriber **${ctx.input.subscriberId || ctx.input.emailAddress}** in list **${ctx.input.listId}**.`
    };
  })
  .build();
