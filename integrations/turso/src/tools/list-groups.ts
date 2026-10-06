import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientForContext } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `Choose an organization with list_organizations. List all database groups in the organization. Groups are logical containers for databases with regional replication.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationSlug: z
        .string()
        .optional()
        .describe(
          'Organization slug. Call list_organizations to discover authorized organizations; older connections may use their saved organization.'
        )
    })
  )
  .output(
    z.object({
      groups: z.array(
        z.object({
          groupName: z.string().describe('Name of the group'),
          groupUuid: z.string().describe('Unique identifier of the group'),
          locations: z
            .array(z.string())
            .optional()
            .describe('All locations where the group has replicas'),
          primary: z.string().describe('Primary location of the group'),
          archived: z.boolean().optional().describe('Whether the group is archived'),
          version: z.string().optional().describe('Group version')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const client = clientForContext(ctx);

    let result = await client.listGroups();

    let groups = result.groups.map(g => ({
      groupName: g.name,
      groupUuid: g.uuid,
      locations: g.locations,
      primary: g.primary,
      archived: g.archived,
      version: g.version
    }));

    return {
      output: { groups },
      message: `Found **${groups.length}** group(s) in the organization.`
    };
  })
  .build();
