import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let emailEventInputSchema = z.object({
  eventType: z.string().describe('Type of email event'),
  timestamp: z.string().describe('Event timestamp'),
  email: z.string().describe('Recipient email'),
  campaignName: z.string().optional().describe('Campaign name'),
  campaignId: z.number().optional().describe('Campaign ID'),
  umk: z.string().optional().describe('Unique message key'),
  url: z.string().optional().describe('Clicked URL (for click events)'),
  useragent: z.string().optional().describe('User agent string'),
  ip: z.string().optional().describe('IP address'),
  bounceType: z.string().optional().describe('Bounce type (soft or hard)'),
  reason: z.string().optional().describe('Bounce/spam reason')
});

export let emailEventsTrigger = SlateTrigger.create(spec, {
  name: 'Email Events',
  key: 'email_events',
  description:
    'Triggers when email engagement events occur in Remarkety, including sent, delivered, opened, clicked, bounced, spam, and unsubscribed events.'
})
  .input(emailEventInputSchema)
  .output(
    z.object({
      recipientEmail: z.string().describe('Recipient email address'),
      campaignName: z.string().optional().describe('Campaign name'),
      campaignId: z.number().optional().describe('Campaign ID'),
      messageKey: z.string().optional().describe('Unique message key'),
      timestamp: z.string().describe('Event timestamp'),
      clickedUrl: z
        .string()
        .optional()
        .describe('The URL that was clicked (click events only)'),
      userAgent: z.string().optional().describe('User agent of the recipient'),
      ipAddress: z.string().optional().describe('IP address of the recipient'),
      bounceType: z
        .string()
        .optional()
        .describe('Type of bounce (soft/hard) for bounce events'),
      reason: z.string().optional().describe('Reason for bounce, spam, or unsubscribe')
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
            campaignName: data.campaign_name ? String(data.campaign_name) : undefined,
            campaignId: data.campaign_id ? Number(data.campaign_id) : undefined,
            umk: data.umk ? String(data.umk) : undefined,
            url: data.url ? String(data.url) : undefined,
            useragent: data.useragent ? String(data.useragent) : undefined,
            ip: data.ip ? String(data.ip) : undefined,
            bounceType: data.bounce_type ? String(data.bounce_type) : undefined,
            reason: data.reason ? String(data.reason) : undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        'email/sent': 'email.sent',
        'email/delivered': 'email.delivered',
        'email/opened': 'email.opened',
        'email/clicked': 'email.clicked',
        'email/bounced': 'email.bounced',
        'email/spam': 'email.spam',
        'email/unsubscribed': 'email.unsubscribed'
      };

      let type =
        typeMap[ctx.input.eventType] || `email.${ctx.input.eventType.replace('email/', '')}`;
      let id =
        ctx.input.umk || `${ctx.input.eventType}-${ctx.input.email}-${ctx.input.timestamp}`;

      return {
        type,
        id,
        output: {
          recipientEmail: ctx.input.email,
          campaignName: ctx.input.campaignName,
          campaignId: ctx.input.campaignId,
          messageKey: ctx.input.umk,
          timestamp: ctx.input.timestamp,
          clickedUrl: ctx.input.url,
          userAgent: ctx.input.useragent,
          ipAddress: ctx.input.ip,
          bounceType: ctx.input.bounceType,
          reason: ctx.input.reason
        }
      };
    }
  })
  .build();
