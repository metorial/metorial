import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCampaign = SlateTool.create(spec, {
  name: 'Get Campaign',
  key: 'get_campaign',
  description: `Retrieve a campaign by ID, including performance statistics such as sent count, open/click/bounce/unsubscribe/spam counts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('ID of the campaign to retrieve')
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('Campaign ID'),
      title: z.string().describe('Campaign title'),
      subject: z.string().describe('Email subject line'),
      html: z.string().describe('HTML content of the email'),
      fromName: z.string().describe('Sender name'),
      fromEmail: z.string().describe('Sender email'),
      scheduledAt: z.string().nullable().describe('Scheduled send time'),
      sentAt: z.string().nullable().describe('Actual send time'),
      sentCount: z.number().describe('Number of emails sent'),
      uniqueOpenCount: z.number().describe('Unique opens'),
      uniqueClickCount: z.number().describe('Unique clicks'),
      unsubscribeCount: z.number().describe('Unsubscribes'),
      bounceCount: z.number().describe('Bounces'),
      spamCount: z.number().describe('Spam reports'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let campaign = await client.getCampaign(ctx.input.campaignId);

    return {
      output: {
        campaignId: campaign.id,
        title: campaign.title,
        subject: campaign.subject,
        html: campaign.html,
        fromName: campaign.from_name,
        fromEmail: campaign.from_email,
        scheduledAt: campaign.scheduled_at,
        sentAt: campaign.sent_at,
        sentCount: campaign.sent_count,
        uniqueOpenCount: campaign.unique_open_count,
        uniqueClickCount: campaign.unique_click_count,
        unsubscribeCount: campaign.unsubscribe_count,
        bounceCount: campaign.bounce_count,
        spamCount: campaign.spam_count,
        createdAt: campaign.created_at
      },
      message: `Retrieved campaign **${campaign.title}** (ID: ${campaign.id}). Sent: ${campaign.sent_count}, Opens: ${campaign.unique_open_count}, Clicks: ${campaign.unique_click_count}.`
    };
  })
  .build();
