import { SlateTool } from 'slates';
import { z } from 'zod';
import { MakeClient } from '../lib/client';
import { spec } from '../spec';

export let getUsage = SlateTool.create(spec, {
  name: 'Get Usage',
  key: 'get_usage',
  description: `Retrieve usage statistics for an organization or team. Returns daily operations count, data transfer, and centicredits usage for the past 30 days.`,
  tags: {
    readOnly: true
  },
  instructions: ['Provide either organizationId or teamId to get usage for.']
})
  .input(
    z.object({
      organizationId: z.number().optional().describe('Organization ID to get usage for'),
      teamId: z.number().optional().describe('Team ID to get usage for')
    })
  )
  .output(
    z.object({
      usage: z
        .any()
        .describe('Usage data including daily operations, data transfer, and centicredits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MakeClient({
      token: ctx.auth.token,
      zoneUrl: ctx.config.zoneUrl
    });

    if (!ctx.input.organizationId && !ctx.input.teamId) {
      throw new Error('Either organizationId or teamId must be provided');
    }

    let result: any;
    let scope: string;

    if (ctx.input.organizationId) {
      result = await client.getOrganizationUsage(ctx.input.organizationId);
      scope = `organization ${ctx.input.organizationId}`;
    } else {
      result = await client.getTeamUsage(ctx.input.teamId!);
      scope = `team ${ctx.input.teamId}`;
    }

    return {
      output: { usage: result },
      message: `Retrieved usage statistics for ${scope}.`
    };
  })
  .build();
