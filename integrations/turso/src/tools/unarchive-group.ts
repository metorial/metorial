import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientForContext } from '../lib/client';
import { spec } from '../spec';

export let unarchiveGroup = SlateTool.create(spec, {
  tags: { readOnly: false },
  name: 'Unarchive Group',
  key: 'unarchive_group',
  description: `Choose an organization with list_organizations. Unarchive a previously archived database group, restoring access to all its databases.`
})
  .input(
    z.object({
      organizationSlug: z
        .string()
        .optional()
        .describe(
          'Organization slug. Call list_organizations to discover authorized organizations; older connections may use their saved organization.'
        ),
      groupName: z.string().describe('Name of the group to unarchive')
    })
  )
  .output(
    z.object({
      groupName: z.string().describe('Name of the unarchived group'),
      groupUuid: z.string().describe('Unique identifier of the group'),
      locations: z.array(z.string()).optional().describe('Group locations'),
      primary: z.string().describe('Primary location'),
      archived: z.boolean().optional().describe('Whether the group is archived')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientForContext(ctx);

    let result = await client.unarchiveGroup(ctx.input.groupName);
    let g = result.group;

    return {
      output: {
        groupName: g.name,
        groupUuid: g.uuid,
        locations: g.locations,
        primary: g.primary,
        archived: g.archived
      },
      message: `Unarchived group **${g.name}**.`
    };
  })
  .build();
