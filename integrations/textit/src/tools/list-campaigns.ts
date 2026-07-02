import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve campaigns from your TextIt workspace. Filter by UUID or creation date. Returns campaigns with their associated groups and events.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignUuid: z.string().optional().describe('Filter by a specific campaign UUID'),
      before: z
        .string()
        .optional()
        .describe('Return only campaigns created before this date (ISO 8601)'),
      after: z
        .string()
        .optional()
        .describe('Return only campaigns created after this date (ISO 8601)')
    })
  )
  .output(
    z.object({
      campaigns: z.array(
        z.object({
          campaignUuid: z.string(),
          name: z.string(),
          archived: z.boolean(),
          group: z.object({ groupUuid: z.string(), name: z.string() }),
          createdOn: z.string()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.listCampaigns({
      uuid: ctx.input.campaignUuid,
      before: ctx.input.before,
      after: ctx.input.after
    });

    let campaigns = result.results.map(c => ({
      campaignUuid: c.uuid,
      name: c.name,
      archived: c.archived,
      group: { groupUuid: c.group.uuid, name: c.group.name },
      createdOn: c.created_on
    }));

    return {
      output: {
        campaigns,
        hasMore: result.next !== null
      },
      message: `Found **${campaigns.length}** campaign(s).`
    };
  })
  .build();
