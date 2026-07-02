import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let suppressionEventInputSchema = z.object({
  eventType: z.string().describe('Type of suppression event (added or removed)'),
  timestamp: z.string().describe('Event timestamp'),
  email: z.string().describe('Suppressed email address'),
  suppressionType: z
    .string()
    .optional()
    .describe(
      'Suppression type (e.g., unsubscribed, hard_bounce, spam_complaint, manually_suppressed)'
    ),
  reason: z.string().optional().describe('Reason for suppression'),
  clientIp: z.string().optional().describe('Client IP address')
});

export let suppressionEventsTrigger = SlateTrigger.create(spec, {
  name: 'Email Suppression Events',
  key: 'suppression_events',
  description:
    'Triggers when an email is added to or removed from the suppression list in Remarkety. Suppression types include unsubscribed, hard_bounce, spam_complaint, and manually_suppressed.'
})
  .input(suppressionEventInputSchema)
  .output(
    z.object({
      email: z.string().describe('Suppressed email address'),
      timestamp: z.string().describe('Event timestamp'),
      suppressionType: z
        .string()
        .optional()
        .describe(
          'Type of suppression (e.g., unsubscribed, hard_bounce, spam_complaint, manually_suppressed)'
        ),
      reason: z.string().optional().describe('Reason for suppression action'),
      clientIpAddress: z
        .string()
        .optional()
        .describe('Client IP address associated with the action')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;
      let eventTopic =
        ctx.request.headers.get('X-Event-Topic') ||
        ctx.request.headers.get('x-event-topic') ||
        '';

      let eventType =
        typeof eventTopic === 'string'
          ? eventTopic
          : String(data.event_type || data.type || '');

      return {
        inputs: [
          {
            eventType,
            timestamp: String(data.timestamp || new Date().toISOString()),
            email: String(data.email || ''),
            suppressionType: data.type ? String(data.type) : undefined,
            reason: data.reason ? String(data.reason) : undefined,
            clientIp: data.client_ip ? String(data.client_ip) : undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        'email-suppression/added': 'email_suppression.added',
        'email-suppression/removed': 'email_suppression.removed'
      };

      let type =
        typeMap[ctx.input.eventType] ||
        `email_suppression.${ctx.input.eventType.replace('email-suppression/', '')}`;
      let id = `suppression-${ctx.input.email}-${ctx.input.eventType}-${ctx.input.timestamp}`;

      return {
        type,
        id,
        output: {
          email: ctx.input.email,
          timestamp: ctx.input.timestamp,
          suppressionType: ctx.input.suppressionType,
          reason: ctx.input.reason,
          clientIpAddress: ctx.input.clientIp
        }
      };
    }
  })
  .build();
