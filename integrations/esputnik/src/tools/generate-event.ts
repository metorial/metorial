import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateEvent = SlateTool.create(spec, {
  name: 'Generate Event',
  key: 'generate_event',
  description: `Generate a custom event in eSputnik to trigger workflows. Events are used for abandoned cart reminders, transactional emails, password recovery, and other triggered scenarios.
The \`params\` must include a contact identifier (e.g., Email, Phone, externalCustomerId) and can carry any additional data for use in workflows and message templates.`,
  instructions: [
    'The eventTypeKey auto-creates a new event type on first use',
    'params must include at least one contact identifier: Email, Phone, externalCustomerId, ContactId, PushToken, or ContactKey',
    'Maximum request body size is 20 KB'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      eventTypeKey: z
        .string()
        .max(100)
        .describe('Event type identifier (e.g., "abandoned_cart", "order_created")'),
      keyValue: z
        .string()
        .max(300)
        .optional()
        .describe('Unique key for the event instance, used for deduplication'),
      params: z
        .record(z.string(), z.any())
        .describe(
          'Event parameters as flat key-value pairs. Must include a contact identifier (Email, Phone, externalCustomerId, etc.)'
        )
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the event was accepted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let payload: { eventTypeKey: string; keyValue?: string; params: Record<string, any> } = {
      eventTypeKey: ctx.input.eventTypeKey,
      params: ctx.input.params
    };

    if (ctx.input.keyValue) {
      payload.keyValue = ctx.input.keyValue;
    }

    await client.generateEvent(payload);

    return {
      output: { sent: true },
      message: `Event **${ctx.input.eventTypeKey}** generated successfully.`
    };
  })
  .build();
