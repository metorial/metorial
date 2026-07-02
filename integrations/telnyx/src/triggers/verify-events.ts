import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let verifyEvents = SlateTrigger.create(spec, {
  name: 'Verify Events',
  key: 'verify_events',
  description:
    'Receive webhook events for two-factor authentication (Verify) status changes including sent, delivered, and failed events. Configure the webhook URL on a Verify Profile.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The event type (e.g., verify.sent, verify.delivered, verify.failed)'),
      eventId: z.string().describe('Unique event ID'),
      occurredAt: z.string().optional().describe('When the event occurred'),
      verificationId: z.string().optional().describe('Verification request ID'),
      verifyProfileId: z.string().optional().describe('Verify profile ID'),
      phoneNumber: z.string().optional().describe('Phone number the verification was sent to'),
      status: z.string().optional().describe('Verification status'),
      verifyType: z
        .string()
        .optional()
        .describe('Verification delivery type (sms, call, flashcall, whatsapp)'),
      rawPayload: z.any().optional().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      verificationId: z.string().describe('Verification request ID'),
      verifyProfileId: z.string().optional().describe('Verify profile ID'),
      phoneNumber: z.string().optional().describe('Phone number'),
      status: z.string().optional().describe('Verification status'),
      verifyType: z.string().optional().describe('Verification delivery type'),
      occurredAt: z.string().optional().describe('When the event occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let event = body?.data;
      if (!event) {
        return { inputs: [] };
      }

      let payload = event.payload ?? {};
      let eventType = event.event_type ?? 'verify.unknown';
      let eventId = event.id ?? `verify-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            occurredAt: event.occurred_at,
            verificationId: payload.id ?? payload.verification_id,
            verifyProfileId: payload.verify_profile_id,
            phoneNumber: payload.phone_number,
            status: payload.status,
            verifyType: payload.verify_type ?? payload.type,
            rawPayload: payload
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          verificationId: ctx.input.verificationId ?? ctx.input.eventId,
          verifyProfileId: ctx.input.verifyProfileId,
          phoneNumber: ctx.input.phoneNumber,
          status: ctx.input.status,
          verifyType: ctx.input.verifyType,
          occurredAt: ctx.input.occurredAt
        }
      };
    }
  })
  .build();
