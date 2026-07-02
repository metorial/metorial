import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let smsEventInputSchema = z.object({
  eventType: z.string().describe('Type of SMS event'),
  timestamp: z.string().describe('Event timestamp'),
  email: z.string().optional().describe('Associated email address'),
  toPhone: z.string().optional().describe('Recipient phone number'),
  fromPhone: z.string().optional().describe('Sender phone number'),
  campaignName: z.string().optional().describe('Campaign name'),
  campaignId: z.number().optional().describe('Campaign ID'),
  umk: z.string().optional().describe('Unique message key'),
  body: z.string().optional().describe('SMS message body'),
  charactersCount: z.number().optional().describe('Character count of SMS'),
  isTest: z.boolean().optional().describe('Whether this was a test message'),
  recipientCountryCode: z.string().optional().describe('Recipient country code'),
  url: z.string().optional().describe('Clicked URL'),
  userAgent: z.string().optional().describe('User agent string'),
  ip: z.string().optional().describe('IP address'),
  phoneNumber: z.string().optional().describe('Phone number for unsubscribe events'),
  reason: z.string().optional().describe('Unsubscribe reason')
});

export let smsEventsTrigger = SlateTrigger.create(spec, {
  name: 'SMS Events',
  key: 'sms_events',
  description:
    'Triggers when SMS events occur in Remarkety, including sent, clicked, replied, and unsubscribed events.'
})
  .input(smsEventInputSchema)
  .output(
    z.object({
      email: z.string().optional().describe('Associated email address'),
      toPhone: z.string().optional().describe('Recipient phone number'),
      fromPhone: z.string().optional().describe('Sender phone number'),
      campaignName: z.string().optional().describe('Campaign name'),
      campaignId: z.number().optional().describe('Campaign ID'),
      messageKey: z.string().optional().describe('Unique message key'),
      timestamp: z.string().describe('Event timestamp'),
      messageBody: z.string().optional().describe('SMS message body'),
      charactersCount: z.number().optional().describe('Character count of SMS'),
      isTest: z.boolean().optional().describe('Whether this was a test message'),
      recipientCountryCode: z.string().optional().describe('Recipient country code'),
      clickedUrl: z.string().optional().describe('The URL that was clicked'),
      userAgent: z.string().optional().describe('User agent of the clicker'),
      ipAddress: z.string().optional().describe('IP address'),
      unsubscribePhoneNumber: z.string().optional().describe('Phone number that unsubscribed'),
      unsubscribeReason: z.string().optional().describe('Reason for unsubscription')
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
            email: data.email ? String(data.email) : undefined,
            toPhone: data.to ? String(data.to) : undefined,
            fromPhone: data.from ? String(data.from) : undefined,
            campaignName: data.campaign_name ? String(data.campaign_name) : undefined,
            campaignId: data.campaign_id ? Number(data.campaign_id) : undefined,
            umk: data.umk ? String(data.umk) : undefined,
            body: data.body ? String(data.body) : undefined,
            charactersCount: data.characters_count ? Number(data.characters_count) : undefined,
            isTest: data.is_test !== undefined ? Boolean(data.is_test) : undefined,
            recipientCountryCode: data.recipient_country_code
              ? String(data.recipient_country_code)
              : undefined,
            url: data.url ? String(data.url) : undefined,
            userAgent: data.user_agent ? String(data.user_agent) : undefined,
            ip: data.ip ? String(data.ip) : undefined,
            phoneNumber: data.phone_number ? String(data.phone_number) : undefined,
            reason: data.reason ? String(data.reason) : undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        'sms/sent': 'sms.sent',
        'sms/clicked': 'sms.clicked',
        'sms/replied': 'sms.replied',
        'sms/unsubscribed': 'sms.unsubscribed'
      };

      let type =
        typeMap[ctx.input.eventType] || `sms.${ctx.input.eventType.replace('sms/', '')}`;
      let id =
        ctx.input.umk ||
        `${ctx.input.eventType}-${ctx.input.toPhone || ctx.input.email || ''}-${ctx.input.timestamp}`;

      return {
        type,
        id,
        output: {
          email: ctx.input.email,
          toPhone: ctx.input.toPhone,
          fromPhone: ctx.input.fromPhone,
          campaignName: ctx.input.campaignName,
          campaignId: ctx.input.campaignId,
          messageKey: ctx.input.umk,
          timestamp: ctx.input.timestamp,
          messageBody: ctx.input.body,
          charactersCount: ctx.input.charactersCount,
          isTest: ctx.input.isTest,
          recipientCountryCode: ctx.input.recipientCountryCode,
          clickedUrl: ctx.input.url,
          userAgent: ctx.input.userAgent,
          ipAddress: ctx.input.ip,
          unsubscribePhoneNumber: ctx.input.phoneNumber,
          unsubscribeReason: ctx.input.reason
        }
      };
    }
  })
  .build();
