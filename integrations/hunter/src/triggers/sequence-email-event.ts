import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let sequenceEmailEvent = SlateTrigger.create(spec, {
  name: 'Sequence Email Event',
  key: 'sequence_email_event',
  description:
    'Triggers when an email event occurs in a Hunter sequence — email sent, opened, link clicked, or replied. Webhooks must be configured in the Hunter dashboard under Campaign Settings or per-sequence Integration tab.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Type of the event (e.g., email_sent, email_opened, link_clicked, email_replied)'
        ),
      eventId: z.string().describe('Unique ID for deduplication'),
      recipientEmail: z.string().describe('Recipient email address'),
      sequenceId: z.string().nullable().describe('Sequence (campaign) ID'),
      sequenceName: z.string().nullable().describe('Sequence name'),
      recipientFirstName: z.string().nullable().describe('Recipient first name'),
      recipientLastName: z.string().nullable().describe('Recipient last name'),
      sentAt: z.string().nullable().describe('Timestamp when the event occurred'),
      raw: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      recipientEmail: z.string().describe('Recipient email address'),
      recipientFirstName: z.string().nullable().describe('Recipient first name'),
      recipientLastName: z.string().nullable().describe('Recipient last name'),
      sequenceId: z.string().nullable().describe('Sequence ID'),
      sequenceName: z.string().nullable().describe('Sequence name'),
      eventTimestamp: z.string().nullable().describe('Timestamp of the event')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // Handle both single event and array of events
      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => {
        // Normalize event type from the webhook payload
        let rawType = event.event ?? event.event_type ?? event.type ?? 'unknown';
        let eventType = rawType.toLowerCase().replace(/\s+/g, '_');

        // Map common variants
        if (eventType === 'sent' || eventType === 'email sent') eventType = 'email_sent';
        if (
          eventType === 'opened' ||
          eventType === 'email opened' ||
          eventType === 'read' ||
          eventType === 'email_read'
        )
          eventType = 'email_opened';
        if (
          eventType === 'clicked' ||
          eventType === 'link clicked' ||
          eventType === 'link_clicked'
        )
          eventType = 'link_clicked';
        if (
          eventType === 'replied' ||
          eventType === 'email replied' ||
          eventType === 'email_reply'
        )
          eventType = 'email_replied';

        let recipientEmail =
          event.recipient_email ?? event.email ?? event.recipient?.email ?? '';
        let sequenceId = String(
          event.campaign_id ?? event.sequence_id ?? event.campaign?.id ?? ''
        );
        let eventId =
          event.id ??
          `${eventType}-${sequenceId}-${recipientEmail}-${event.created_at ?? event.timestamp ?? Date.now()}`;

        return {
          eventType,
          eventId: String(eventId),
          recipientEmail,
          sequenceId: sequenceId || null,
          sequenceName:
            event.campaign_name ?? event.sequence_name ?? event.campaign?.name ?? null,
          recipientFirstName:
            event.recipient_first_name ??
            event.first_name ??
            event.recipient?.first_name ??
            null,
          recipientLastName:
            event.recipient_last_name ?? event.last_name ?? event.recipient?.last_name ?? null,
          sentAt: event.created_at ?? event.timestamp ?? event.sent_at ?? null,
          raw: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: `sequence_email.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          recipientEmail: ctx.input.recipientEmail,
          recipientFirstName: ctx.input.recipientFirstName,
          recipientLastName: ctx.input.recipientLastName,
          sequenceId: ctx.input.sequenceId,
          sequenceName: ctx.input.sequenceName,
          eventTimestamp: ctx.input.sentAt
        }
      };
    }
  })
  .build();
