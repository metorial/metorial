import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `List all database groups in the organization. Groups are logical containers for databases with regional replication.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      groups: z.array(
        z.object({
          groupName: z.string().describe('Name of the group'),
          groupUuid: z.string().describe('Unique identifier of the group'),
          locations: z
            .array(z.string())
            .describe('All locations where the group has replicas'),
          primary: z.string().describe('Primary location of the group'),
          archived: z.boolean().describe('Whether the group is archived'),
          version: z.string().describe('Group version')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

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
