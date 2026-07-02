import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCampaign = SlateTool.create(spec, {
  name: 'Update Campaign',
  key: 'update_campaign',
  description: `Update a campaign's settings. Can modify name, schedule, daily limits, tracking options, and other configuration. Also supports launching (activating) or pausing a campaign by setting the desired action.`,
  instructions: [
    'To launch a campaign, set action to "activate". To pause it, set action to "pause".',
    'Only provide the fields you want to change; unspecified fields remain unchanged.'
  ]
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign to update.'),
      action: z
        .enum(['activate', 'pause'])
        .optional()
        .describe('Launch or pause the campaign.'),
      name: z.string().optional().describe('New campaign name.'),
      dailyLimit: z.number().optional().describe('Daily email sending limit.'),
      stopOnReply: z.boolean().optional().describe('Stop sending when a reply is received.'),
      stopOnAutoReply: z
        .boolean()
        .optional()
        .describe('Stop sending when an auto-reply is received.'),
      linkTracking: z.boolean().optional().describe('Enable link click tracking.'),
      openTracking: z.boolean().optional().describe('Enable open tracking.'),
      textOnly: z.boolean().optional().describe('Send text-only emails (no HTML).'),
      campaignSchedule: z
        .any()
        .optional()
        .describe('Full campaign schedule object to replace the existing schedule.')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('Campaign ID'),
      name: z.string().describe('Campaign name'),
      status: z.number().describe('Campaign status after update'),
      timestampUpdated: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { campaignId, action, ...fields } = ctx.input;

    let updatePayload: Record<string, any> = {};
    if (fields.name !== undefined) updatePayload.name = fields.name;
    if (fields.dailyLimit !== undefined) updatePayload.daily_limit = fields.dailyLimit;
    if (fields.stopOnReply !== undefined) updatePayload.stop_on_reply = fields.stopOnReply;
    if (fields.stopOnAutoReply !== undefined)
      updatePayload.stop_on_auto_reply = fields.stopOnAutoReply;
    if (fields.linkTracking !== undefined) updatePayload.link_tracking = fields.linkTracking;
    if (fields.openTracking !== undefined) updatePayload.open_tracking = fields.openTracking;
    if (fields.textOnly !== undefined) updatePayload.text_only = fields.textOnly;
    if (fields.campaignSchedule !== undefined)
      updatePayload.campaign_schedule = fields.campaignSchedule;

    let result: any;

    if (Object.keys(updatePayload).length > 0) {
      result = await client.updateCampaign(campaignId, updatePayload);
    }

    if (action === 'activate') {
      result = await client.activateCampaign(campaignId);
    } else if (action === 'pause') {
      result = await client.pauseCampaign(campaignId);
    }

    if (!result) {
      result = await client.getCampaign(campaignId);
    }

    return {
      output: {
        campaignId: result.id,
        name: result.name,
        status: result.status,
        timestampUpdated: result.timestamp_updated
      },
      message: `Updated campaign **${result.name}**${action ? ` and ${action === 'activate' ? 'launched' : 'paused'} it` : ''}.`
    };
  })
  .build();
