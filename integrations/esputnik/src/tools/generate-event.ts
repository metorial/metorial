import { createApiServiceError, SlateTool } from 'slates';
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
    'Pass a contact identifier in params, such as contactId, externalCustomerId, email, phone, or pushToken, using the parameter names configured for your workflows',
    'Repeated requests are processed separately; prevent unwanted duplicate events in the calling system',
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
        .describe(
          'Event key, usually a value unique to the contact; does not prevent repeated requests'
        ),
      params: z
        .record(z.string(), z.any())
        .describe(
          'Event parameters as a JSON object, including nested values and contact identifiers used by your workflows'
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

    if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > 20 * 1024) {
      throw createApiServiceError(
        'The event request exceeds the documented 20 KB limit. Reduce params or ask eSputnik support to raise your limit.'
      );
    }
    await client.generateEvent(payload);

    return {
      output: { sent: true },
      message: `Event **${ctx.input.eventTypeKey}** accepted for processing.`
    };
  })
  .build();
