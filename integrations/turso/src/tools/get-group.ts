import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getGroup = SlateTool.create(spec, {
  name: 'Get Group',
  key: 'get_group',
  description: `Retrieve detailed information about a specific database group, including its locations, primary region, and archive status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupName: z.string().describe('Name of the group to retrieve')
    })
  )
  .output(
    z.object({
      groupName: z.string().describe('Name of the group'),
      groupUuid: z.string().describe('Unique identifier of the group'),
      locations: z.array(z.string()).describe('All locations where the group has replicas'),
      primary: z.string().describe('Primary location of the group'),
      archived: z.boolean().describe('Whether the group is archived'),
      version: z.string().describe('Group version')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

    let result = await client.getGroup(ctx.input.groupName);
    let g = result.group;

    return {
      output: {
        groupName: g.name,
        groupUuid: g.uuid,
        locations: g.locations,
        primary: g.primary,
        archived: g.archived,
        version: g.version
      },
      message: `Group **${g.name}** has ${g.locations.length} location(s): ${g.locations.join(', ')} (primary: ${g.primary}).`
    };
  })
  .build();
