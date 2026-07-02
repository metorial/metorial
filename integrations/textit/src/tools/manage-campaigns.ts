import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCampaigns = SlateTool.create(spec, {
  name: 'Manage Campaigns',
  key: 'manage_campaigns',
  description: `Create or update campaigns in your TextIt workspace. Campaigns automate scheduled actions for contact groups. Each campaign is associated with a contact group.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update'])
        .describe('Whether to create a new campaign or update an existing one'),
      campaignUuid: z
        .string()
        .optional()
        .describe('UUID of the campaign to update (required for update)'),
      name: z.string().optional().describe('Name of the campaign'),
      groupUuid: z.string().optional().describe('UUID of the contact group for the campaign')
    })
  )
  .output(
    z.object({
      campaignUuid: z.string(),
      name: z.string(),
      archived: z.boolean(),
      group: z.object({ groupUuid: z.string(), name: z.string() }),
      createdOn: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let campaign: any;

    if (ctx.input.action === 'create') {
      campaign = await client.createCampaign({
        name: ctx.input.name!,
        group: ctx.input.groupUuid!
      });
    } else {
      campaign = await client.updateCampaign(ctx.input.campaignUuid!, {
        name: ctx.input.name,
        group: ctx.input.groupUuid
      });
    }

    return {
      output: {
        campaignUuid: campaign.uuid,
        name: campaign.name,
        archived: campaign.archived,
        group: { groupUuid: campaign.group.uuid, name: campaign.group.name },
        createdOn: campaign.created_on
      },
      message: `Campaign **${campaign.name}** ${ctx.input.action === 'create' ? 'created' : 'updated'} successfully.`
    };
  })
  .build();
