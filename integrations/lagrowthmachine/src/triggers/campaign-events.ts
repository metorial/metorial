import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let campaignEvents = SlateTrigger.create(spec, {
  name: 'Campaign Events',
  key: 'campaign_events',
  description: 'Triggers when a lead finishes a campaign sequence in La Growth Machine.'
})
  .input(
    z.object({
      eventType: z.literal('campaign.ended').describe('Type of campaign event'),
      eventId: z.string().describe('Unique event identifier'),
      leadId: z.string().optional().describe('ID of the lead that finished the campaign'),
      campaignId: z.string().optional().describe('ID of the campaign'),
      campaignName: z.string().optional().describe('Name of the campaign'),
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
      leadId: z.string().optional().describe('ID of the lead that finished the campaign'),
      campaignId: z.string().optional().describe('ID of the campaign'),
      campaignName: z.string().optional().describe('Name of the campaign'),
      firstname: z.string().optional().describe('First name of the lead'),
      lastname: z.string().optional().describe('Last name of the lead'),
      email: z.string().optional().describe('Email address of the lead'),
      linkedinUrl: z.string().optional().describe('LinkedIn profile URL of the lead'),
      timestamp: z
        .string()
        .optional()
        .describe('Timestamp when the campaign ended for this lead')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => {
        let eventId =
          event.id || event.eventId || `campaign.ended-${event.leadId || ''}-${Date.now()}`;

        return {
          eventType: 'campaign.ended' as const,
          eventId: String(eventId),
          leadId: event.leadId ? String(event.leadId) : undefined,
          campaignId: event.campaignId ? String(event.campaignId) : undefined,
          campaignName: event.campaignName || event.campaign,
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
          campaignName: ctx.input.campaignName,
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
