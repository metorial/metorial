import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let webhookPayloadSchema = z.object({
  eventId: z.string().describe('Unique identifier for this webhook delivery'),
  eventType: z.string().describe('Event type (e.g., email_verifier.instant.completed)'),
  eventMode: z.string().optional().describe('Event mode: live or test'),
  eventCreatedOn: z.string().optional().describe('Timestamp of when the event was created'),
  payload: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Raw event payload from Clearout')
});

let verificationResultSchema = z.object({
  emailAddress: z.string().optional().describe('Verified email address'),
  status: z
    .string()
    .optional()
    .describe('Verification status (valid, invalid, unknown, catch_all)'),
  safeToSend: z.string().optional().describe('Whether the email is safe to send to (yes/no)'),
  disposable: z.string().optional().describe('Whether the email is disposable (yes/no)'),
  free: z.string().optional().describe('Whether the email is from a free provider (yes/no)'),
  role: z.string().optional().describe('Whether the email is role-based (yes/no)'),
  gibberish: z.string().optional().describe('Whether the email appears gibberish (yes/no)'),
  aiVerdict: z.string().optional().describe('AI-generated verdict'),
  suggestedEmailAddress: z
    .string()
    .optional()
    .describe('Suggested correction if typo detected')
});

let finderResultSchema = z.object({
  emails: z
    .array(
      z.object({
        emailAddress: z.string().optional().describe('Discovered email address'),
        role: z.string().optional().describe('Whether role-based (yes/no)'),
        business: z.string().optional().describe('Whether business email (yes/no)')
      })
    )
    .optional()
    .describe('Discovered email addresses'),
  confidenceScore: z.number().optional().describe('Confidence score'),
  domain: z.string().optional().describe('Domain searched'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  companyName: z.string().optional().describe('Company name')
});

let bulkResultSchema = z.object({
  listId: z.string().optional().describe('Bulk list ID'),
  listName: z.string().optional().describe('Bulk list name')
});

export let clearoutEvents = SlateTrigger.create(spec, {
  name: 'Clearout Events',
  key: 'clearout_events',
  description:
    'Receive real-time notifications when email verifications, email finder operations, or form guard validations complete. Covers instant and bulk operations across all Clearout services.'
})
  .input(webhookPayloadSchema)
  .output(
    z.object({
      eventType: z.string().describe('Event type identifier'),
      eventMode: z.string().optional().describe('Event mode: live or test'),
      eventCreatedOn: z.string().optional().describe('Event creation timestamp'),

      // Verification fields (instant verification & form guard)
      verification: verificationResultSchema
        .optional()
        .describe('Email verification result (for verification and form guard events)'),

      // Finder fields (instant finder)
      finder: finderResultSchema
        .optional()
        .describe('Email finder result (for finder events)'),

      // Bulk fields (bulk verification & bulk finder)
      bulk: bulkResultSchema.optional().describe('Bulk operation result (for bulk events)'),

      rawPayload: z.record(z.string(), z.unknown()).optional().describe('Raw event payload')
    })
  )
  .webhook({
    // Clearout webhooks are configured manually via the dashboard UI, not via API
    // No autoRegisterWebhook or autoUnregisterWebhook

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, unknown>;

      let eventId = String(body.event_id ?? `evt_${Date.now()}`);
      let eventType = String(body.event_type ?? 'unknown');
      let eventMode = body.event_mode as string | undefined;
      let eventCreatedOn = body.event_created_on as string | undefined;
      let payload = body.payload as Record<string, unknown> | undefined;

      return {
        inputs: [
          {
            eventId,
            eventType,
            eventMode,
            eventCreatedOn,
            payload: payload ?? body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, eventId, eventMode, eventCreatedOn, payload } = ctx.input;

      let payloadData = (payload?.data ?? payload) as Record<string, unknown> | undefined;

      let verification: z.infer<typeof verificationResultSchema> | undefined;
      let finder: z.infer<typeof finderResultSchema> | undefined;
      let bulk: z.infer<typeof bulkResultSchema> | undefined;

      if (
        eventType === 'email_verifier.instant.completed' ||
        eventType === 'form_guard.email_validation.completed'
      ) {
        let data = payloadData ?? {};
        verification = {
          emailAddress: data.email_address as string | undefined,
          status: data.status as string | undefined,
          safeToSend: data.safe_to_send as string | undefined,
          disposable: data.disposable as string | undefined,
          free: data.free as string | undefined,
          role: data.role as string | undefined,
          gibberish: data.gibberish as string | undefined,
          aiVerdict: data.ai_verdict as string | undefined,
          suggestedEmailAddress: data.suggested_email_address as string | undefined
        };
      } else if (eventType === 'email_finder.instant.completed') {
        let data = payloadData ?? {};
        let emailsRaw = (data.emails ?? []) as Record<string, unknown>[];
        let company = data.company as Record<string, unknown> | undefined;
        finder = {
          emails: emailsRaw.map(e => ({
            emailAddress: e.email_address as string | undefined,
            role: e.role as string | undefined,
            business: e.business as string | undefined
          })),
          confidenceScore: data.confidence_score as number | undefined,
          domain: data.domain as string | undefined,
          firstName: data.first_name as string | undefined,
          lastName: data.last_name as string | undefined,
          companyName: company?.name as string | undefined
        };
      } else if (
        eventType === 'email_verifier.bulk.completed' ||
        eventType === 'email_finder.bulk.completed'
      ) {
        let data = payloadData ?? {};
        bulk = {
          listId: data.list_id as string | undefined,
          listName: data.list_name as string | undefined
        };
      }

      return {
        type: eventType,
        id: eventId,
        output: {
          eventType,
          eventMode,
          eventCreatedOn,
          verification,
          finder,
          bulk,
          rawPayload: payload
        }
      };
    }
  })
  .build();
