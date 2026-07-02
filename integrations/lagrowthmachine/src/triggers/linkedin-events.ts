import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let linkedinEventTypes = z.enum([
  'linkedin.contact_request_sent',
  'linkedin.contact_request_accepted',
  'linkedin.message_sent',
  'linkedin.message_replied',
  'linkedin.profile_visited'
]);

export let linkedinEvents = SlateTrigger.create(spec, {
  name: 'LinkedIn Events',
  key: 'linkedin_events',
  description:
    'Triggers when LinkedIn-related events occur in La Growth Machine, including connection requests sent/accepted, messages sent/replied, and profile visits.'
})
  .input(
    z.object({
      eventType: linkedinEventTypes.describe('Type of LinkedIn event'),
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
        let eventType = mapLinkedInEventType(event.type || event.eventType || event.event);
        let eventId =
          event.id || event.eventId || `${eventType}-${event.leadId || ''}-${Date.now()}`;

        return {
          eventType: eventType as z.infer<typeof linkedinEventTypes>,
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

let mapLinkedInEventType = (type: string | undefined): string => {
  if (!type) return 'linkedin.message_sent';
  let normalized = type.toLowerCase().replace(/[\s]/g, '_');
  if (normalized.includes('request') && normalized.includes('accept'))
    return 'linkedin.contact_request_accepted';
  if (normalized.includes('request') && normalized.includes('sent'))
    return 'linkedin.contact_request_sent';
  if (normalized.includes('request')) return 'linkedin.contact_request_sent';
  if (normalized.includes('replied') || normalized.includes('reply'))
    return 'linkedin.message_replied';
  if (normalized.includes('visit')) return 'linkedin.profile_visited';
  if (normalized.includes('message') && normalized.includes('sent'))
    return 'linkedin.message_sent';
  if (normalized.includes('message')) return 'linkedin.message_sent';
  return 'linkedin.message_sent';
};
