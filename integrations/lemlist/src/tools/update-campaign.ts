import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, optionalText, text } from '../lib/client';
import { spec } from '../spec';

export let updateCampaign = SlateTool.create(spec, {
  name: 'Update Campaign',
  key: 'update_campaign',
  description: `Update settings for an existing campaign. Can modify the name, tracking options, stop conditions, and interest settings. Can also start or pause the campaign.`,
  instructions: [
    'Use the "action" field to start or pause a campaign without changing settings.',
    'All setting fields are optional - only provided fields will be updated.',
    'Starting a campaign can launch outreach. When settings and an action are combined they run sequentially; earlier changes can remain applied if a later operation fails.'
  ],
  tags: { readOnly: false, destructive: true }
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
    const client = new Client({ token: ctx.auth.token }),
      { campaignId, action, ...settings } = ctx.input;
    await client.getCampaign(campaignId);
    const hasSettings = Object.values(settings).some(value => value !== undefined);
    if (hasSettings) await client.updateCampaign(campaignId, settings);
    if (action === 'start') await client.startCampaign(campaignId);
    else if (action === 'pause') await client.pauseCampaign(campaignId);
    const result = await client.getCampaign(campaignId);
    return {
      output: {
        campaignId: text(result._id),
        name: optionalText(result.name),
        status: optionalText(result.status ?? result.state)
      },
      message: `Retrieved current campaign state after ${hasSettings || action ? 'the requested operations' : 'checking the campaign'}.`
    };
  })
  .build();
