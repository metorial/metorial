import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let emailEventTypes = z.enum(['email.sent', 'email.opened', 'email.clicked', 'email.replied']);

export let emailEvents = SlateTrigger.create(spec, {
  name: 'Email Events',
  key: 'email_events',
  description:
    'Triggers when email-related events occur in La Growth Machine, including email sent, opened, clicked, or replied.'
})
  .input(
    z.object({
      eventType: emailEventTypes.describe('Type of email event'),
      eventId: z.string().describe('Unique event identifier'),
      leadId: z.string().optional().describe('ID of the affected lead'),
      campaignId: z.string().optional().describe('ID of the associated campaign'),
      firstname: z.string().optional().describe('First name of the lead'),
      lastname: z.string().optional().describe('Last name of the lead'),
      email: z.string().optional().describe('Email address of the lead'),
      linkedinUrl: z.string().optional().describe('LinkedIn profile URL of the lead'),
      timestamp: z.string().optional().describe('Timestamp of the event'),
      payload: z.any().optional().describe('Full event payload from LGM')
    })
  )
  .output(
    z.object({
      leadId: z.string().optional().describe('ID of the affected lead'),
      campaignId: z.string().optional().describe('ID of the associated campaign'),
      firstname: z.string().optional().describe('First name of the lead'),
      lastname: z.string().optional().describe('Last name of the lead'),
      email: z.string().optional().describe('Email address of the lead'),
      linkedinUrl: z.string().optional().describe('LinkedIn profile URL of the lead'),
      timestamp: z.string().optional().describe('Timestamp when the event occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => {
        let eventType = mapEmailEventType(event.type || event.eventType || event.event);
        let eventId =
          event.id || event.eventId || `${eventType}-${event.leadId || ''}-${Date.now()}`;

        return {
          eventType: eventType as z.infer<typeof emailEventTypes>,
          eventId: String(eventId),
          leadId: event.leadId ? String(event.leadId) : undefined,
          campaignId: event.campaignId ? String(event.campaignId) : undefined,
          firstname: event.firstname || event.firstName,
          lastname: event.lastname || event.lastName,
          email: event.email || event.proEmail,
          linkedinUrl: event.linkedinUrl,
          timestamp: event.timestamp || event.createdAt || event.date,
          payload: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          leadId: ctx.input.leadId,
          campaignId: ctx.input.campaignId,
          firstname: ctx.input.firstname,
          lastname: ctx.input.lastname,
          email: ctx.input.email,
          linkedinUrl: ctx.input.linkedinUrl,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();

let mapEmailEventType = (type: string | undefined): string => {
  if (!type) return 'email.sent';
  let normalized = type.toLowerCase().replace(/[_\s]/g, '.');
  if (normalized.includes('replied') || normalized.includes('reply')) return 'email.replied';
  if (normalized.includes('clicked') || normalized.includes('click')) return 'email.clicked';
  if (normalized.includes('opened') || normalized.includes('open')) return 'email.opened';
  if (normalized.includes('sent') || normalized.includes('send')) return 'email.sent';
  return 'email.sent';
};
