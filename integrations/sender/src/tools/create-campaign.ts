import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCampaign = SlateTool.create(spec, {
  name: 'Create Campaign',
  key: 'create_campaign',
  description: `Creates a new email campaign in Sender as a draft. Configure the subject, sender information, content, and target groups or segments. The campaign is created in DRAFT status and must be sent separately.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subject: z.string().describe('Email subject line'),
      senderName: z.string().describe('Sender display name shown to recipients'),
      replyToEmail: z
        .string()
        .describe('Reply-to email address (must be from a verified domain)'),
      contentType: z.enum(['editor', 'html', 'text']).describe('Content format type'),
      title: z.string().optional().describe('Internal campaign name for reports'),
      preheader: z.string().optional().describe('Email preview text shown in inbox'),
      groupIds: z.array(z.string()).optional().describe('Target group IDs to send to'),
      segmentIds: z.array(z.string()).optional().describe('Target segment IDs to send to'),
      content: z
        .string()
        .optional()
        .describe('Campaign body content (HTML or text depending on contentType)'),
      enableGoogleAnalytics: z
        .boolean()
        .optional()
        .default(false)
        .describe('Enable Google Analytics tracking')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('Unique ID of the created campaign'),
      subject: z.string().describe('Campaign subject'),
      status: z.string().describe('Campaign status (will be DRAFT)'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createCampaign({
      subject: ctx.input.subject,
      from: ctx.input.senderName,
      reply_to: ctx.input.replyToEmail,
      content_type: ctx.input.contentType,
      title: ctx.input.title,
      preheader: ctx.input.preheader,
      groups: ctx.input.groupIds,
      segments: ctx.input.segmentIds,
      content: ctx.input.content,
      google_analytics: ctx.input.enableGoogleAnalytics ? 1 : 0
    });

    let campaign = result.data;

    return {
      output: {
        campaignId: campaign.id,
        subject: campaign.subject,
        status: campaign.status,
        createdAt: campaign.created
      },
      message: `Campaign **"${campaign.subject}"** created with ID \`${campaign.id}\` in ${campaign.status} status.`
    };
  })
  .build();
