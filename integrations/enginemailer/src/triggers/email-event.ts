import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let emailEvent = SlateTrigger.create(spec, {
  name: 'Email Event',
  key: 'email_event',
  description:
    'Receives webhook notifications for email delivery events including delivery, bounce, open, click, unsubscribe, and spam complaint events. Configure the webhook callback URL in Enginemailer under Domains → {domain} → Webhooks.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of email event'),
      email: z.string().describe('Recipient email address'),
      transactionId: z.string().optional().describe('Transaction ID for the email'),
      eventDate: z.string().optional().describe('Date when the event occurred'),
      ipAddress: z.string().optional().describe('IP address (for open events)'),
      deviceCategory: z.string().optional().describe('Device category (for open events)'),
      deviceString: z.string().optional().describe('Device string (for open events)'),
      country: z.string().optional().describe('Country (for open events)'),
      clickedUrl: z.string().optional().describe('URL clicked (for click events)'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      email: z.string().describe('Recipient email address'),
      transactionId: z.string().optional().describe('Transaction ID'),
      eventDate: z.string().optional().describe('Date of the event'),
      ipAddress: z.string().optional().describe('IP address of the recipient'),
      deviceCategory: z.string().optional().describe('Device category used to open'),
      deviceString: z.string().optional().describe('Device description'),
      country: z.string().optional().describe('Country of the recipient'),
      clickedUrl: z.string().optional().describe('URL that was clicked')
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

      if (!data) {
        return { inputs: [] };
      }

      let eventType = (data.event ?? data.Event ?? 'unknown').toString().toLowerCase();
      let details = data.details ?? data.Details ?? data;

      let email = details.email ?? details.Email ?? data.email ?? data.Email ?? '';
      let transactionId =
        details.txid ?? details.TxId ?? details.transactionid ?? data.txid ?? '';
      let eventDate =
        details.opendate ??
        details.clickdate ??
        details.date ??
        details.OpenDate ??
        details.ClickDate ??
        '';
      let ipAddress = details.ip_address ?? details.IpAddress ?? '';
      let deviceCategory = details.devicecategory ?? details.DeviceCategory ?? '';
      let deviceString = details.devicestring ?? details.DeviceString ?? '';
      let country = details.country ?? details.Country ?? '';
      let clickedUrl = details.url ?? details.Url ?? details.URL ?? '';

      return {
        inputs: [
          {
            eventType,
            email: email.toString(),
            transactionId: transactionId.toString() || undefined,
            eventDate: eventDate.toString() || undefined,
            ipAddress: ipAddress.toString() || undefined,
            deviceCategory: deviceCategory.toString() || undefined,
            deviceString: deviceString.toString() || undefined,
            country: country.toString() || undefined,
            clickedUrl: clickedUrl.toString() || undefined,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        delivered: 'email.delivered',
        delivery: 'email.delivered',
        bounced: 'email.bounced',
        bounce: 'email.bounced',
        opened: 'email.opened',
        open: 'email.opened',
        clicked: 'email.clicked',
        click: 'email.clicked',
        unsubscribed: 'email.unsubscribed',
        unsubscribe: 'email.unsubscribed',
        spam: 'email.spam_complaint',
        'spam-complaint': 'email.spam_complaint',
        spam_complaint: 'email.spam_complaint',
        spamcomplaint: 'email.spam_complaint'
      };

      let type = typeMap[ctx.input.eventType] ?? `email.${ctx.input.eventType}`;
      let id = `${type}-${ctx.input.email}-${ctx.input.transactionId ?? ''}-${ctx.input.eventDate ?? Date.now()}`;

      return {
        type,
        id,
        output: {
          email: ctx.input.email,
          transactionId: ctx.input.transactionId,
          eventDate: ctx.input.eventDate,
          ipAddress: ctx.input.ipAddress,
          deviceCategory: ctx.input.deviceCategory,
          deviceString: ctx.input.deviceString,
          country: ctx.input.country,
          clickedUrl: ctx.input.clickedUrl
        }
      };
    }
  })
  .build();
