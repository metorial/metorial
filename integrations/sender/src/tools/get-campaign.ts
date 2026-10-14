import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCampaign = SlateTool.create(spec, {
  name: 'Get Campaign',
  key: 'get_campaign',
  description:
    'Retrieves an email campaign with its sender, status, content, audience IDs, and timestamps. Discover campaign IDs with list_campaigns.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      campaignId: z.string().describe('Campaign ID from create_campaign or list_campaigns')
    })
  )
  .output(
    z.object({
      campaignId: z.string(),
      subject: z.string(),
      title: z.string().nullable(),
      status: z.string(),
      contentType: z.string(),
      senderName: z.string().nullable(),
      replyToEmail: z.string().nullable(),
      content: z.string().nullable(),
      groupIds: z.array(z.string()),
      segmentIds: z.array(z.string()),
      createdAt: z.string(),
      modifiedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getCampaign(ctx.input.campaignId);
    let campaign = result.data;
    return {
      output: {
        campaignId: campaign.id,
        subject: campaign.subject,
        title: campaign.title ?? null,
        status: campaign.status,
        contentType: campaign.content_type ?? campaign.editor ?? 'UNKNOWN',
        senderName: campaign.from ?? null,
        replyToEmail: campaign.reply_to ?? null,
        content: campaign.html?.html_content ?? campaign.html?.html_body ?? null,
        groupIds: campaign.campaign_groups ?? campaign.groups ?? [],
        segmentIds: campaign.segments ?? [],
        createdAt: campaign.created,
        modifiedAt: campaign.modified
      },
      message: `Retrieved campaign **${campaign.subject}** in ${campaign.status} status.`
    };
  })
  .build();
