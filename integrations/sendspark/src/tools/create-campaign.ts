import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCampaign = SlateTool.create(spec, {
  name: 'Create Campaign',
  key: 'create_campaign',
  description: `Create a new dynamic video campaign in your Sendspark workspace. The campaign serves as a template for generating personalized videos for prospects.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new dynamic video campaign')
    })
  )
  .output(
    z.object({
      campaignId: z.string(),
      name: z.string(),
      status: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret,
      workspaceId: ctx.config.workspaceId
    });

    let result = await client.createCampaign(ctx.input.name);

    let responseData = result.response || result;
    let campaign = Array.isArray(responseData.data) ? responseData.data[0] : responseData;

    return {
      output: {
        campaignId: campaign._id,
        name: campaign.name,
        status: campaign.status,
        createdAt: campaign.createdAt
      },
      message: `Created campaign **${campaign.name}** with ID \`${campaign._id}\`.`
    };
  })
  .build();
