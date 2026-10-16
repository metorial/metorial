import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getDynamicsSettings = SlateTool.create(spec, {
  name: 'Get Personalization Settings',
  key: 'get_dynamics_settings',
  description:
    "Get the workspace's supported voice cloning and multivariable personalization languages.",
  tags: { readOnly: true }
})
  .input(z.object({ workspaceId: workspaceIdSchema }))
  .output(z.object({ settings: z.record(z.string(), z.unknown()) }))
  .handleInvocation(async ctx => {
    let settings = await createClient(ctx).getDynamicsSettings();
    return { output: { settings }, message: 'Retrieved personalization settings.' };
  })
  .build();

export let updateCampaignSettings = SlateTool.create(spec, {
  name: 'Update Campaign Fallback Settings',
  key: 'update_campaign_settings',
  description: 'Enable or disable fallback data for a dynamic video campaign.',
  tags: { destructive: false }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      campaignId: z.string().describe('Dynamic campaign ID from list_campaigns'),
      useFallbackData: z.boolean().describe('Whether to use fallback personalization data')
    })
  )
  .output(z.object({ response: z.unknown().optional() }))
  .handleInvocation(async ctx => {
    let response = await createClient(ctx).updateCampaignSettings(
      ctx.input.campaignId,
      ctx.input.useFallbackData
    );
    return {
      output: { response },
      message: 'Sendspark accepted the campaign settings update.'
    };
  })
  .build();
