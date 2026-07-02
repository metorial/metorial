import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getGroup = SlateTool.create(spec, {
  name: 'Get Group',
  key: 'get_group',
  description: `Retrieve details of a specific VEO group (community) by ID, including its members.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the group to retrieve'),
      includeMembers: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to also fetch group members')
    })
  )
  .output(
    z.object({
      group: z.record(z.string(), z.any()).describe('Group details'),
      members: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Group members (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    let group = await client.getGroup(ctx.input.groupId);

    let members: Record<string, unknown>[] | undefined;
    if (ctx.input.includeMembers) {
      try {
        members = await client.getGroupMembers(ctx.input.groupId);
      } catch (_e) {
        ctx.warn('Could not retrieve group members.');
      }
    }

    let groupName = group.Name ?? group.name ?? ctx.input.groupId;

    return {
      output: { group, members },
      message: `Retrieved group **"${groupName}"** (\`${ctx.input.groupId}\`)${members ? ` with ${members.length} members` : ''}.`
    };
  })
  .build();
