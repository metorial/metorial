import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCampaign = SlateTool.create(spec, {
  name: 'Get Campaign',
  key: 'get_campaign',
  description: `Retrieve full details of a specific campaign including its schedule, sequences, settings, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign to retrieve.')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('Campaign ID'),
      name: z.string().describe('Campaign name'),
      status: z.number().describe('Campaign status'),
      isEvergreen: z.boolean().optional().describe('Whether the campaign is evergreen'),
      dailyLimit: z.number().optional().describe('Daily sending limit'),
      stopOnReply: z.boolean().optional().describe('Whether to stop sending on reply'),
      stopOnAutoReply: z
        .boolean()
        .optional()
        .describe('Whether to stop sending on auto-reply'),
      linkTracking: z.boolean().optional().describe('Whether link tracking is enabled'),
      openTracking: z.boolean().optional().describe('Whether open tracking is enabled'),
      textOnly: z.boolean().optional().describe('Whether to send text-only emails'),
      campaignSchedule: z.any().optional().describe('Campaign schedule configuration'),
      sequences: z.any().optional().describe('Email sequences and steps'),
      timestampCreated: z.string().optional().describe('Creation timestamp'),
      timestampUpdated: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let c = await client.getCampaign(ctx.input.campaignId);

    return {
      output: {
        campaignId: c.id,
        name: c.name,
        status: c.status,
        isEvergreen: c.is_evergreen,
        dailyLimit: c.daily_limit,
        stopOnReply: c.stop_on_reply,
        stopOnAutoReply: c.stop_on_auto_reply,
        linkTracking: c.link_tracking,
        openTracking: c.open_tracking,
        textOnly: c.text_only,
        campaignSchedule: c.campaign_schedule,
        sequences: c.sequences,
        timestampCreated: c.timestamp_created,
        timestampUpdated: c.timestamp_updated
      },
      message: `Retrieved campaign **${c.name}** (status: ${c.status}).`
    };
  })
  .build();
