import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCampaign = SlateTool.create(spec, {
  name: 'Create Campaign',
  key: 'create_campaign',
  description: `Create a new email campaign as a draft. Optionally schedule it for a specific time. To send immediately, use the **Send Campaign** tool after creation.`,
  constraints: [
    'Subject lines cannot start with "RE:" or "FWD:".',
    'At least one list must be assigned to send or schedule a campaign.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Internal title of the campaign'),
      subject: z.string().describe('Email subject line'),
      html: z.string().describe('HTML content of the email body'),
      fromName: z.string().describe('Sender display name'),
      fromEmail: z.string().describe('Sender email address'),
      listIds: z.array(z.number()).describe('List IDs to send the campaign to'),
      scheduledAt: z
        .string()
        .optional()
        .describe('ISO 8601 datetime to schedule sending (e.g. "2025-01-15T10:00:00Z")'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone for scheduled sending (e.g. "America/New_York")'),
      previewText: z.string().optional().describe('Preview text shown in email clients')
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('ID of the created campaign'),
      title: z.string().describe('Campaign title'),
      subject: z.string().describe('Email subject line'),
      fromName: z.string().describe('Sender name'),
      fromEmail: z.string().describe('Sender email'),
      scheduledAt: z.string().nullable().describe('Scheduled send time'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let campaign = await client.createCampaign({
      title: ctx.input.title,
      subject: ctx.input.subject,
      html: ctx.input.html,
      fromName: ctx.input.fromName,
      fromEmail: ctx.input.fromEmail,
      listIds: ctx.input.listIds,
      scheduledAt: ctx.input.scheduledAt,
      timezone: ctx.input.timezone,
      previewText: ctx.input.previewText
    });

    return {
      output: {
        campaignId: campaign.id,
        title: campaign.title,
        subject: campaign.subject,
        fromName: campaign.from_name,
        fromEmail: campaign.from_email,
        scheduledAt: campaign.scheduled_at,
        createdAt: campaign.created_at
      },
      message: `Campaign **${campaign.title}** created as draft (ID: ${campaign.id}).${campaign.scheduled_at ? ` Scheduled for ${campaign.scheduled_at}.` : ''}`
    };
  })
  .build();
