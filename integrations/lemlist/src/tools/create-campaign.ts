import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, optionalStrings, optionalText, text } from '../lib/client';
import { spec } from '../spec';

export let createCampaign = SlateTool.create(spec, {
  name: 'Create Campaign',
  key: 'create_campaign',
  description: `Create an outreach campaign with an empty sequence and a default schedule. Returns its identifiers and provider-reported state. Review the campaign before adding or launching leads; creating it does not prove that messages can be sent.`,
  tags: {
    readOnly: false,
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
    const result = await new Client({ token: ctx.auth.token }).createCampaign(ctx.input.name);
    return {
      output: {
        campaignId: text(result._id),
        name: optionalText(result.name),
        sequenceId: optionalText(result.sequenceId),
        scheduleIds: optionalStrings(result.scheduleIds),
        state: optionalText(result.state ?? result.status)
      },
      message: `Created campaign \`${text(result._id)}\` with its sequence and schedule. Review its configuration before launching leads.`
    };
  })
  .build();
