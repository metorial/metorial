import { SlateTool } from 'slates';
import { z } from 'zod';
import { MeasurementProtocolClient } from '../lib/client';
import {
  apiSecretSchema,
  measurementIdSchema,
  resolveMeasurementProtocolCredentials
} from '../lib/measurement-protocol';
import { spec } from '../spec';

export let validateEvents = SlateTool.create(spec, {
  name: 'Validate Events',
  key: 'validate_events',
  description: `Validate event data against the GA4 Measurement Protocol without actually sending the events. Use this to test event payloads for errors before sending them to production.

Returns validation messages indicating any issues with the event data format, parameter names, or values.`,
  instructions: [
    'Use this tool before "send_events" to catch formatting issues or invalid parameters.',
    'If measurementId is supplied by the user or configured for the integration, call this tool directly with that measurement ID.',
    'For OAuth connections without a known measurementId, first use manage_data_streams with action "list" or "get" to select a web stream and read webStreamData.measurementId.',
    'Pass apiSecret from manage_data_streams action "list_secrets" or "create_secret". Measurement Protocol Only auth can provide measurementId and apiSecret as a fallback.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      measurementId: measurementIdSchema,
      apiSecret: apiSecretSchema,
      clientId: z
        .string()
        .describe('A unique client identifier (same format as send_events).'),
      userId: z.string().optional().describe('Optional known user ID.'),
      events: z
        .array(
          z.object({
            name: z.string().describe('Event name to validate.'),
            params: z
              .record(z.string(), z.any())
              .optional()
              .describe('Event parameters to validate.')
          })
        )
        .min(1)
        .max(25)
        .describe('Events to validate.'),
      userProperties: z
        .record(
          z.string(),
          z.object({
            value: z.any()
          })
        )
        .optional()
        .describe('User properties to validate.')
    })
  )
  .output(
    z.object({
      validationMessages: z
        .array(
          z.object({
            fieldPath: z.string().optional(),
            description: z.string().optional(),
            validationCode: z.string().optional()
          })
        )
        .optional(),
      valid: z.boolean().describe('Whether all events passed validation.')
    })
  )
  .handleInvocation(async ctx => {
    let credentials = resolveMeasurementProtocolCredentials(ctx.input, ctx.config, ctx.auth);

    let client = new MeasurementProtocolClient({
      measurementId: credentials.measurementId,
      apiSecret: credentials.apiSecret
    });

    let result = await client.validateEvents({
      clientId: ctx.input.clientId,
      userId: ctx.input.userId,
      events: ctx.input.events,
      userProperties: ctx.input.userProperties as Record<string, { value: any }> | undefined
    });

    let messages = result.validationMessages || [];
    let isValid = messages.length === 0;

    return {
      output: {
        validationMessages: messages,
        valid: isValid
      },
      message: isValid
        ? `All **${ctx.input.events.length}** event(s) passed validation.`
        : `Validation found **${messages.length}** issue(s): ${messages.map((m: any) => m.description).join('; ')}.`
    };
  })
  .build();
