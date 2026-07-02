import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCampaigns = SlateTool.create(spec, {
  name: 'Get Campaigns',
  key: 'get_campaigns',
  description: `Retrieve all survey campaigns and optionally all survey templates. Each campaign includes its metric type (NPS, CSAT, CES, 5-Star), channel (email, link, in-app, Intercom), campaign type (transactional, recurring), and active status.
Use this to find campaign IDs for sending surveys or filtering feedback.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeTemplates: z
        .boolean()
        .optional()
        .describe('Also retrieve available survey templates (default: false)')
    })
  )
  .output(
    z.object({
      campaigns: z
        .array(
          z.object({
            campaignId: z.string().describe('Campaign ID'),
            name: z.string().describe('Campaign name'),
            isActive: z.boolean().describe('Whether the campaign is active'),
            templateId: z.string().optional().describe('Assigned template ID'),
            metric: z.string().describe('Survey metric type (NPS, CSAT, CES, STAR)'),
            type: z.string().describe('Campaign type (transactional, recurring, etc.)'),
            channel: z.string().describe('Delivery channel (email, link, inapp, intercom)')
          })
        )
        .describe('List of campaigns'),
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Template ID'),
            name: z.string().describe('Template name'),
            channel: z.string().optional().describe('Template channel'),
            metric: z.string().optional().describe('Template metric type')
          })
        )
        .optional()
        .describe('List of templates (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let campaignData = await client.getCampaigns();
    let campaigns = (campaignData.campaigns || []).map((c: any) => ({
      campaignId: c.id,
      name: c.name,
      isActive: c.isActive,
      templateId: c.templateId,
      metric: c.metric,
      type: c.type,
      channel: c.channel
    }));

    let templates: any[] | undefined;
    if (ctx.input.includeTemplates) {
      let templateData = await client.getTemplates();
      templates = (templateData.templates || []).map((t: any) => ({
        templateId: t.id,
        name: t.name,
        channel: t.channel,
        metric: t.metric
      }));
    }

    return {
      output: { campaigns, templates },
      message: `Retrieved **${campaigns.length}** campaign(s)${templates ? ` and **${templates.length}** template(s)` : ''}.`
    };
  })
  .build();
