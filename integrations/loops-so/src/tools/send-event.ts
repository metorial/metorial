import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendEvent = SlateTool.create(spec, {
  name: 'Send Event',
  key: 'send_event',
  description: `Send a named event for a contact to trigger automated email workflows (loops) in Loops. Events can include custom properties and manage mailing list subscriptions. If the contact does not exist, a new one is created automatically.`,
  instructions: [
    'Provide either email or userId (or both) to identify the contact.',
    'The eventName must match an event configured in your Loops workflows.',
    'Submitting an event can immediately trigger emails and update contact identity, properties or subscriptions. Success confirms submission, not workflow completion or email delivery.',
    'Use a stable unique idempotencyKey for this logical submission. Do not repeat an uncertain submission automatically.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      idempotencyKey: z
        .string()
        .optional()
        .describe(
          "Optional unique request ID, at most 100 characters. Sent in Idempotency-Key; reuse is limited to the provider's 24-hour window."
        ),
      eventName: z
        .string()
        .describe('Name of the event to send (must match a configured event in Loops)'),
      email: z.string().optional().describe('Email address of the contact'),
      userId: z.string().optional().describe('External user ID of the contact'),
      eventProperties: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .optional()
        .describe('Custom event properties as key-value pairs'),
      mailingLists: z
        .record(z.string(), z.boolean())
        .optional()
        .describe('Map of mailing list IDs to subscription status'),
      contactProperties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Contact properties to update alongside the event')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the event was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.sendEvent({
      eventName: ctx.input.eventName,
      email: ctx.input.email,
      userId: ctx.input.userId,
      eventProperties: ctx.input.eventProperties,
      mailingLists: ctx.input.mailingLists,
      contactProperties: ctx.input.contactProperties,
      idempotencyKey: ctx.input.idempotencyKey
    });

    return {
      output: { success: result.success },
      message: 'Submitted the event for the requested contact.'
    };
  })
  .build();
