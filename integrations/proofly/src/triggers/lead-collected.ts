import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let leadCollected = SlateTrigger.create(spec, {
  name: 'Lead Collected',
  key: 'lead_collected',
  description:
    'Triggers when a new lead is collected through a Proofly notification widget (e.g., an email collector form).'
})
  .input(
    z.object({
      leadId: z.string().describe('Unique identifier for the lead event'),
      submittedInput: z
        .string()
        .optional()
        .describe('User-submitted input such as email address'),
      visitorIp: z.string().optional().describe('IP address of the visitor'),
      pageUrl: z.string().optional().describe('URL of the page where the lead was collected'),
      city: z.string().optional().describe('Visitor city from geolocation'),
      country: z.string().optional().describe('Visitor country from geolocation'),
      notificationId: z
        .string()
        .optional()
        .describe('ID of the notification that collected the lead'),
      campaignId: z
        .string()
        .optional()
        .describe('ID of the campaign the notification belongs to'),
      timestamp: z.string().optional().describe('When the lead was collected')
    })
  )
  .output(
    z.object({
      submittedInput: z
        .string()
        .optional()
        .describe('User-submitted input such as email address'),
      visitorIp: z.string().optional().describe('IP address of the visitor'),
      pageUrl: z.string().optional().describe('URL of the page where the lead was collected'),
      city: z.string().optional().describe('Visitor city from geolocation'),
      country: z.string().optional().describe('Visitor country from geolocation'),
      notificationId: z
        .string()
        .optional()
        .describe('ID of the notification that collected the lead'),
      campaignId: z
        .string()
        .optional()
        .describe('ID of the campaign the notification belongs to'),
      collectedAt: z.string().optional().describe('When the lead was collected')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      // Handle both single event and array payloads
      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => ({
        leadId: String(
          event.id ??
            event._id ??
            event.leadId ??
            event.lead_id ??
            `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        ),
        submittedInput:
          event.input ??
          event.email ??
          event.submittedInput ??
          event.submitted_input ??
          event.value,
        visitorIp: event.ip ?? event.visitorIp ?? event.visitor_ip,
        pageUrl: event.pageUrl ?? event.page_url ?? event.url,
        city: event.city ?? event.geolocation?.city ?? event.geo?.city,
        country: event.country ?? event.geolocation?.country ?? event.geo?.country,
        notificationId:
          (event.notificationId ?? event.notification_id)
            ? String(event.notificationId ?? event.notification_id)
            : undefined,
        campaignId:
          (event.campaignId ?? event.campaign_id)
            ? String(event.campaignId ?? event.campaign_id)
            : undefined,
        timestamp: event.timestamp ?? event.createdAt ?? event.created_at ?? event.date
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: 'lead.collected',
        id: ctx.input.leadId,
        output: {
          submittedInput: ctx.input.submittedInput,
          visitorIp: ctx.input.visitorIp,
          pageUrl: ctx.input.pageUrl,
          city: ctx.input.city,
          country: ctx.input.country,
          notificationId: ctx.input.notificationId,
          campaignId: ctx.input.campaignId,
          collectedAt: ctx.input.timestamp
        }
      };
    }
  })
  .build();
