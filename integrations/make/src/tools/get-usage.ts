import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor, container } from '../lib/client';
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
      teamId: z
        .number()
        .optional()
        .describe(
          'Team ID; call list_teams after list_organizations to discover authorized IDs. to get usage for'
        )
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
    const client = clientFor(ctx);
    container(ctx.input);
    const usage =
      ctx.input.organizationId !== undefined
        ? await client.getOrganizationUsage(ctx.input.organizationId)
        : await client.getTeamUsage(ctx.input.teamId!);
    return {
      output: { usage },
      message:
        'Returned native daily usage over the past 30 days in the requesting user timezone; centicredits remain in native units.'
    };
  })
  .build();
