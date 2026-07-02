import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCampaign = SlateTool.create(spec, {
  name: 'Update Campaign',
  key: 'update_campaign',
  description: `Update an existing draft campaign's subject, content, sender info, lists, or schedule. All fields are optional.`,
  constraints: [
    'Only draft campaigns (not yet sent) can be updated.',
    'Subject lines cannot start with "RE:" or "FWD:".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('ID of the campaign to update'),
      title: z.string().optional().describe('New internal title'),
      subject: z.string().optional().describe('New email subject line'),
      html: z.string().optional().describe('New HTML content'),
      fromName: z.string().optional().describe('New sender display name'),
      fromEmail: z.string().optional().describe('New sender email'),
      listIds: z.array(z.number()).optional().describe('New list IDs to send to'),
      scheduledAt: z.string().optional().describe('New scheduled send time (ISO 8601)'),
      timezone: z.string().optional().describe('Timezone for scheduled sending'),
      previewText: z.string().optional().describe('Preview text shown in email clients')
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('ID of the updated campaign'),
      title: z.string().describe('Campaign title'),
      subject: z.string().describe('Email subject line'),
      updatedAt: z.string().describe('Update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let campaign = await client.updateCampaign(ctx.input.campaignId, {
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
        updatedAt: campaign.updated_at
      },
      message: `Campaign **${campaign.title}** (ID: ${campaign.id}) updated successfully.`
    };
  })
  .build();
