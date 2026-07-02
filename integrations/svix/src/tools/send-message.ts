import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { svixServiceError } from '../lib/errors';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a webhook message to a specific application. The message will be dispatched to all matching endpoints of that application. Optionally auto-create the application if it doesn't exist by including application details.`,
  instructions: [
    'eventType should follow a dot-separated naming convention like "invoice.paid" or "user.created".',
    'The payload can be any JSON object and will be delivered as the webhook body.',
    'If you set an eventId, it acts as an idempotency key (unique per app for 24 hours).'
  ]
})
  .input(
    z.object({
      applicationId: z.string().describe('Application ID or UID to send the message to'),
      eventType: z.string().describe('Event type identifier (e.g., "invoice.paid")'),
      eventId: z
        .string()
        .optional()
        .describe('Unique event ID for idempotency (unique per app for ~24h)'),
      payload: z
        .record(z.string(), z.unknown())
        .describe('JSON payload delivered as the webhook body'),
      channels: z
        .array(z.string())
        .optional()
        .describe('Channels to tag the message with for endpoint filtering'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Free-form message tags that can be used when listing messages'),
      deliverAt: z
        .string()
        .optional()
        .describe('Optional ISO timestamp to schedule delivery, best effort'),
      payloadRetentionHours: z
        .number()
        .optional()
        .describe(
          'Number of hours to retain the payload. Mutually exclusive with payloadRetentionPeriod.'
        ),
      payloadRetentionPeriod: z
        .number()
        .optional()
        .describe(
          'Number of days to retain the payload (default 90). Mutually exclusive with payloadRetentionHours.'
        ),
      transformationsParams: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Extra parameters made available to endpoint transformations'),
      autoCreateApp: z
        .object({
          name: z.string().describe('Name for the auto-created application'),
          uid: z.string().optional().describe('Custom UID for the auto-created application'),
          throttleRate: z
            .number()
            .optional()
            .describe('Maximum messages per second for the auto-created application')
        })
        .optional()
        .describe('If provided, automatically creates the application if it does not exist')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Svix message ID'),
      eventType: z.string().describe('Event type of the sent message'),
      eventId: z.string().optional().describe('Event ID if provided'),
      deliverAt: z.string().nullable().optional().describe('Scheduled delivery time if set'),
      tags: z.array(z.string()).optional().describe('Message tags'),
      timestamp: z.string().describe('When the message was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    if (
      ctx.input.payloadRetentionHours !== undefined &&
      ctx.input.payloadRetentionPeriod !== undefined
    ) {
      throw svixServiceError(
        'payloadRetentionHours and payloadRetentionPeriod are mutually exclusive.'
      );
    }

    ctx.progress('Sending message...');
    let msg = await client.createMessage(ctx.input.applicationId, {
      eventType: ctx.input.eventType,
      eventId: ctx.input.eventId,
      payload: ctx.input.payload,
      channels: ctx.input.channels,
      tags: ctx.input.tags,
      deliverAt: ctx.input.deliverAt,
      payloadRetentionHours: ctx.input.payloadRetentionHours,
      payloadRetentionPeriod: ctx.input.payloadRetentionPeriod,
      transformationsParams: ctx.input.transformationsParams,
      application: ctx.input.autoCreateApp
        ? {
            name: ctx.input.autoCreateApp.name,
            uid: ctx.input.autoCreateApp.uid,
            throttleRate: ctx.input.autoCreateApp.throttleRate
          }
        : undefined
    });

    return {
      output: {
        messageId: msg.id,
        eventType: msg.eventType,
        eventId: msg.eventId ?? undefined,
        deliverAt: msg.deliverAt,
        tags: msg.tags ?? undefined,
        timestamp: msg.timestamp
      },
      message: `Sent **${msg.eventType}** message \`${msg.id}\` to application \`${ctx.input.applicationId}\`.`
    };
  })
  .build();
