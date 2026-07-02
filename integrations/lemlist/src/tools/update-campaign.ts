import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCampaign = SlateTool.create(spec, {
  name: 'Update Campaign',
  key: 'update_campaign',
  description: `Update settings for an existing campaign. Can modify the name, tracking options, stop conditions, and interest settings. Can also start or pause the campaign.`,
  instructions: [
    'Use the "action" field to start or pause a campaign without changing settings.',
    'All setting fields are optional - only provided fields will be updated.'
  ]
})
  .input(
    z.object({
      campaignId: z.string().describe('The ID of the campaign to update'),
      action: z.enum(['start', 'pause']).optional().describe('Start or pause the campaign'),
      name: z.string().optional().describe('New campaign name'),
      stopOnEmailReplied: z
        .boolean()
        .optional()
        .describe('Stop outreach when a lead replies to an email'),
      stopOnMeetingBooked: z
        .boolean()
        .optional()
        .describe('Stop outreach when a meeting is booked'),
      stopOnLinkClicked: z
        .boolean()
        .optional()
        .describe('Stop outreach when a link is clicked'),
      autoLeadInterest: z
        .boolean()
        .optional()
        .describe('Automatically mark leads as interested'),
      disableTrackOpen: z.boolean().optional().describe('Disable open tracking'),
      disableTrackClick: z.boolean().optional().describe('Disable click tracking'),
      disableTrackReply: z.boolean().optional().describe('Disable reply tracking')
    })
  )
  .output(
    z.object({
      campaignId: z.string(),
      name: z.string().optional(),
      status: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { campaignId, action, ...settings } = ctx.input;

    let hasSettings = Object.values(settings).some(v => v !== undefined);
    let result: any;

    if (hasSettings) {
      result = await client.updateCampaign(campaignId, settings);
    }

    if (action === 'start') {
      result = await client.startCampaign(campaignId);
    } else if (action === 'pause') {
      result = await client.pauseCampaign(campaignId);
    }

    if (!result) {
      result = await client.getCampaign(campaignId);
    }

    let actions: string[] = [];
    if (hasSettings) actions.push('updated settings');
    if (action) actions.push(action === 'start' ? 'started' : 'paused');

    return {
      output: {
        campaignId: result._id ?? campaignId,
        name: result.name,
        status: result.status ?? result.state
      },
      message: `Campaign \`${campaignId}\` ${actions.join(' and ')}.`
    };
  })
  .build();
