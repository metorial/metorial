import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCampaign = SlateTool.create(spec, {
  name: 'Update Campaign',
  key: 'update_campaign',
  description: `Update settings for an existing campaign. Allows modifying campaign name, sending limits, timezone, tracking, and unsubscribe options. Only campaigns in DRAFT or EDITED status can be updated.`,
  constraints: [
    'Only campaigns in DRAFT or EDITED status can be updated.',
    'Use "Change Campaign Status" tool to set a running campaign to editable before updating.'
  ]
})
  .input(
    z.object({
      campaignId: z.number().describe('The ID of the campaign to update'),
      name: z.string().optional().describe('New campaign name'),
      emailAccountIds: z
        .array(z.number())
        .optional()
        .describe('Updated list of email account IDs to send from'),
      timezone: z.string().optional().describe('Campaign timezone'),
      prospectTimezone: z.boolean().optional().describe('Whether to use prospect timezone'),
      dailyEnroll: z.number().optional().describe('Max new prospects per day'),
      gdprUnsubscribe: z.boolean().optional().describe('Include GDPR unsubscribe link'),
      listUnsubscribe: z.boolean().optional().describe('Include List-Unsubscribe header'),
      trackOpens: z.boolean().optional().describe('Enable open tracking')
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('Updated campaign ID'),
      name: z.string().describe('Updated campaign name'),
      status: z.string().describe('Campaign status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let payload: any = {};

    if (ctx.input.name) payload.name = ctx.input.name;
    if (ctx.input.emailAccountIds) payload.email_account_ids = ctx.input.emailAccountIds;

    let settings: any = {};
    if (ctx.input.timezone) settings.timezone = ctx.input.timezone;
    if (ctx.input.prospectTimezone !== undefined)
      settings.prospect_timezone = ctx.input.prospectTimezone;
    if (ctx.input.dailyEnroll !== undefined) settings.daily_enroll = ctx.input.dailyEnroll;
    if (ctx.input.gdprUnsubscribe !== undefined)
      settings.gdpr_unsubscribe = ctx.input.gdprUnsubscribe;
    if (ctx.input.listUnsubscribe !== undefined)
      settings.list_unsubscribe = ctx.input.listUnsubscribe;
    if (ctx.input.trackOpens !== undefined)
      settings.open_disabled_list = !ctx.input.trackOpens;

    if (Object.keys(settings).length > 0) {
      payload.settings = settings;
    }

    let result = await client.updateCampaignSettings(ctx.input.campaignId, payload);

    return {
      output: {
        campaignId: result.id ?? result.campaign_id ?? ctx.input.campaignId,
        name: result.name ?? ctx.input.name ?? '',
        status: result.status ?? ''
      },
      message: `Updated campaign **${result.name ?? ctx.input.campaignId}**.`
    };
  })
  .build();
