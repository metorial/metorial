import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let leadLifecycleEventTypes = z.enum([
  'lead.enriched',
  'lead.converted',
  'lead.resubscribed',
  'lead.unsubscribed',
  'lead.new_in_audience',
  'lead.status_changed'
]);

export let leadLifecycleEvents = SlateTrigger.create(spec, {
  name: 'Lead Lifecycle Events',
  key: 'lead_lifecycle_events',
  description:
    'Triggers when lead lifecycle events occur in La Growth Machine, including lead enriched, converted, subscribed/unsubscribed, added to audience, or campaign status changes.'
})
  .input(
    z.object({
      eventType: leadLifecycleEventTypes.describe('Type of lead lifecycle event'),
      eventId: z.string().describe('Unique event identifier'),
      leadId: z.string().optional().describe('ID of the affected lead'),
      campaignId: z.string().optional().describe('ID of the associated campaign'),
      audienceId: z.string().optional().describe('ID of the audience'),
      audienceName: z.string().optional().describe('Name of the audience'),
      firstname: z.string().optional().describe('First name of the lead'),
      lastname: z.string().optional().describe('Last name of the lead'),
      email: z.string().optional().describe('Email address of the lead'),
      linkedinUrl: z.string().optional().describe('LinkedIn profile URL of the lead'),
      status: z
        .string()
        .optional()
        .describe('New status of the lead (for status change events)'),
      timestamp: z.string().optional().describe('Timestamp of the event'),
      payload: z.any().optional().describe('Full event payload from LGM')
    })
  )
  .output(
    z.object({
      leadId: z.string().optional().describe('ID of the affected lead'),
      campaignId: z.string().optional().describe('ID of the associated campaign'),
      audienceId: z.string().optional().describe('ID of the audience'),
      audienceName: z.string().optional().describe('Name of the audience'),
      firstname: z.string().optional().describe('First name of the lead'),
      lastname: z.string().optional().describe('Last name of the lead'),
      email: z.string().optional().describe('Email address of the lead'),
      linkedinUrl: z.string().optional().describe('LinkedIn profile URL of the lead'),
      status: z.string().optional().describe('New status of the lead'),
      timestamp: z.string().optional().describe('Timestamp when the event occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => {
        let eventType = mapLeadLifecycleEventType(
          event.type || event.eventType || event.event
        );
        let eventId =
          event.id || event.eventId || `${eventType}-${event.leadId || ''}-${Date.now()}`;

        return {
          eventType: eventType as z.infer<typeof leadLifecycleEventTypes>,
          eventId: String(eventId),
          leadId: event.leadId ? String(event.leadId) : undefined,
          campaignId: event.campaignId ? String(event.campaignId) : undefined,
          audienceId: event.audienceId ? String(event.audienceId) : undefined,
          audienceName: event.audienceName || event.audience,
          firstname: event.firstname || event.firstName,
          lastname: event.lastname || event.lastName,
          email: event.email || event.proEmail,
          linkedinUrl: event.linkedinUrl,
          status: event.status || event.newStatus,
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
          audienceId: ctx.input.audienceId,
          audienceName: ctx.input.audienceName,
          firstname: ctx.input.firstname,
          lastname: ctx.input.lastname,
          email: ctx.input.email,
          linkedinUrl: ctx.input.linkedinUrl,
          status: ctx.input.status,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();

let mapLeadLifecycleEventType = (type: string | undefined): string => {
  if (!type) return 'lead.status_changed';
  let normalized = type.toLowerCase().replace(/[\s]/g, '_');
  if (normalized.includes('enrich')) return 'lead.enriched';
  if (normalized.includes('convert')) return 'lead.converted';
  if (normalized.includes('resubscri')) return 'lead.resubscribed';
  if (normalized.includes('unsubscri')) return 'lead.unsubscribed';
  if (normalized.includes('new') && normalized.includes('audience'))
    return 'lead.new_in_audience';
  if (normalized.includes('audience')) return 'lead.new_in_audience';
  if (normalized.includes('status')) return 'lead.status_changed';
  return 'lead.status_changed';
};
