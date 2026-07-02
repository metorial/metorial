import { SlateTool } from 'slates';
import { z } from 'zod';
import { ToneDenClient } from '../lib/client';
import { spec } from '../spec';

let playbookOutputSchema = z.object({
  playbookCampaignId: z.number().describe('Unique playbook campaign ID'),
  title: z.string().optional().describe('Campaign title'),
  userId: z.number().optional().describe('Owner user ID'),
  templateId: z.number().optional().describe('Playbook template ID'),
  status: z.string().optional().describe('Campaign status'),
  isArchived: z.boolean().optional().describe('Whether the campaign is archived')
});

export let managePlaybook = SlateTool.create(spec, {
  name: 'Manage Playbook Campaign',
  key: 'manage_playbook',
  description: `Create, retrieve, update, or delete a playbook campaign. Playbooks are pre-structured campaign templates (e.g., Spotify Growth, Instagram Growth, Remarketing Dynamic Event Ads) that automate common marketing strategies.
Each playbook campaign can contain subcampaigns of type ad, attachment, link, or message.`,
  instructions: [
    'A templateId is required when creating a playbook campaign to specify which playbook template to use.',
    'Subcampaigns define the individual components (ads, links, attachments) within the playbook.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'update', 'delete']).describe('Operation to perform'),
      playbookCampaignId: z
        .number()
        .optional()
        .describe('Playbook campaign ID (required for get, update, delete)'),
      title: z.string().optional().describe('Campaign title'),
      templateId: z.number().optional().describe('Playbook template ID (required for create)'),
      status: z
        .enum(['active', 'paused', 'inactive', 'draft'])
        .optional()
        .describe('Campaign status'),
      isArchived: z.boolean().optional().describe('Archive the campaign'),
      subcampaigns: z
        .array(
          z.object({
            type: z.enum(['ad', 'attachment', 'link', 'message']).describe('Subcampaign type'),
            adCampaign: z
              .record(z.string(), z.any())
              .optional()
              .describe('Ad campaign configuration'),
            attachment: z
              .record(z.string(), z.any())
              .optional()
              .describe('Attachment configuration'),
            link: z.record(z.string(), z.any()).optional().describe('Link configuration'),
            messageCampaign: z
              .record(z.string(), z.any())
              .optional()
              .describe('Message campaign configuration')
          })
        )
        .optional()
        .describe('Subcampaigns within the playbook')
    })
  )
  .output(
    z.object({
      playbookCampaign: playbookOutputSchema.optional().describe('Playbook campaign details'),
      deleted: z.boolean().optional().describe('Whether the playbook campaign was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ToneDenClient({ token: ctx.auth.token });
    let { action, playbookCampaignId } = ctx.input;

    let mapPlaybook = (p: any) => ({
      playbookCampaignId: p.id,
      title: p.title,
      userId: p.user_id,
      templateId: p.template_id,
      status: p.status,
      isArchived: p.is_archived
    });

    if (action === 'get') {
      if (!playbookCampaignId)
        throw new Error('playbookCampaignId is required for get action');
      let campaign = await client.getPlaybookCampaign(playbookCampaignId);
      return {
        output: { playbookCampaign: mapPlaybook(campaign) },
        message: `Retrieved playbook campaign **"${campaign.title}"** (ID: ${campaign.id}).`
      };
    }

    if (action === 'delete') {
      if (!playbookCampaignId)
        throw new Error('playbookCampaignId is required for delete action');
      await client.deletePlaybookCampaign(playbookCampaignId);
      return {
        output: { deleted: true },
        message: `Deleted playbook campaign ID **${playbookCampaignId}**.`
      };
    }

    let data: Record<string, any> = {};
    if (ctx.input.title) data.title = ctx.input.title;
    if (ctx.input.templateId) data.template_id = ctx.input.templateId;
    if (ctx.input.status) data.status = ctx.input.status;
    if (ctx.input.isArchived !== undefined) data.is_archived = ctx.input.isArchived;
    if (ctx.input.subcampaigns) {
      data.subcampaigns = ctx.input.subcampaigns.map(sc => {
        let mapped: Record<string, any> = { type: sc.type };
        if (sc.adCampaign) mapped.ad_campaign = sc.adCampaign;
        if (sc.attachment) mapped.attachment = sc.attachment;
        if (sc.link) mapped.link = sc.link;
        if (sc.messageCampaign) mapped.message_campaign = sc.messageCampaign;
        return mapped;
      });
    }

    if (action === 'create') {
      let campaign = await client.createPlaybookCampaign(data);
      return {
        output: { playbookCampaign: mapPlaybook(campaign) },
        message: `Created playbook campaign **"${campaign.title}"** (ID: ${campaign.id}).`
      };
    }

    // update
    if (!playbookCampaignId)
      throw new Error('playbookCampaignId is required for update action');
    let campaign = await client.updatePlaybookCampaign(playbookCampaignId, data);
    return {
      output: { playbookCampaign: mapPlaybook(campaign) },
      message: `Updated playbook campaign **"${campaign.title}"** (ID: ${campaign.id}).`
    };
  })
  .build();
