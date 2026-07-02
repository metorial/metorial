import { SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let launchCampaign = SlateTool.create(spec, {
  name: 'Launch Campaign',
  key: 'launch_campaign',
  description: `Launch a campaign to send a previously created email or SMS message. Supports scheduling for future delivery, read/link tracking, and Google Analytics integration.
Use this after creating an email message with the **Create Email Message** tool.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      messageId: z
        .number()
        .describe('ID of the message to send (from createEmailMessage or createSmsMessage)'),
      startTime: z
        .string()
        .optional()
        .describe('Scheduled send time in YYYY-MM-DD HH:MM format. Omit to send immediately.'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone for the scheduled time (e.g., "America/New_York")'),
      trackRead: z.boolean().optional().describe('Enable open/read tracking'),
      trackLinks: z.boolean().optional().describe('Enable link click tracking'),
      contacts: z
        .string()
        .optional()
        .describe(
          'Comma-separated email addresses to limit the campaign to specific contacts'
        ),
      trackGa: z.boolean().optional().describe('Enable Google Analytics tracking'),
      paymentLimit: z.number().optional().describe('Maximum payment amount for the campaign'),
      paymentCurrency: z
        .string()
        .optional()
        .describe('Currency for payment limit (e.g., "USD", "EUR", "RUB")')
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('ID of the launched campaign'),
      status: z.string().describe('Status of the campaign after launch'),
      count: z.number().describe('Number of contacts the campaign will be sent to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({
      token: ctx.auth.token,
      locale: ctx.config.locale
    });

    let result = await client.createCampaign({
      message_id: ctx.input.messageId,
      start_time: ctx.input.startTime,
      timezone: ctx.input.timezone,
      track_read: ctx.input.trackRead ? 1 : 0,
      track_links: ctx.input.trackLinks ? 1 : 0,
      contacts: ctx.input.contacts,
      track_ga: ctx.input.trackGa ? 1 : 0,
      payment_limit: ctx.input.paymentLimit,
      payment_currency: ctx.input.paymentCurrency
    });

    return {
      output: {
        campaignId: result.campaign_id,
        status: result.status,
        count: result.count
      },
      message: `Launched campaign \`${result.campaign_id}\` for message \`${ctx.input.messageId}\` — **${result.count}** recipients, status: ${result.status}`
    };
  })
  .build();
