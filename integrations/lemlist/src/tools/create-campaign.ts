import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCampaign = SlateTool.create(spec, {
  name: 'Create Campaign',
  key: 'create_campaign',
  description: `Create a new outreach campaign. Returns the new campaign's ID, sequence ID, and schedule IDs. The campaign is created in a running state by default.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new campaign')
    })
  )
  .output(
    z.object({
      campaignId: z.string(),
      name: z.string().optional(),
      sequenceId: z.string().optional(),
      scheduleIds: z.array(z.string()).optional(),
      state: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createCampaign(ctx.input.name);

    return {
      output: {
        campaignId: result._id,
        name: result.name,
        sequenceId: result.sequenceId,
        scheduleIds: result.scheduleIds,
        state: result.state
      },
      message: `Created campaign **"${result.name}"** with ID \`${result._id}\`.`
    };
  })
  .build();
