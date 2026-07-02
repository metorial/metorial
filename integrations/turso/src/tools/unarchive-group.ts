import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let unarchiveGroup = SlateTool.create(spec, {
  name: 'Unarchive Group',
  key: 'unarchive_group',
  description: `Unarchive a previously archived database group, restoring access to all its databases.`
})
  .input(
    z.object({
      groupName: z.string().describe('Name of the group to unarchive')
    })
  )
  .output(
    z.object({
      groupName: z.string().describe('Name of the unarchived group'),
      groupUuid: z.string().describe('Unique identifier of the group'),
      locations: z.array(z.string()).describe('Group locations'),
      primary: z.string().describe('Primary location'),
      archived: z.boolean().describe('Whether the group is archived')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

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
