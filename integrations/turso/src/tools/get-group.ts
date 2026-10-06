import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientForContext } from '../lib/client';
import { spec } from '../spec';

export let getGroup = SlateTool.create(spec, {
  name: 'Get Group',
  key: 'get_group',
  description: `Choose an organization with list_organizations. Retrieve detailed information about a specific database group, including its locations, primary region, and archive status.`,
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
        ),
      groupName: z.string().describe('Name of the group to retrieve')
    })
  )
  .output(
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
  .handleInvocation(async ctx => {
    const client = clientForContext(ctx);

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
      message: `Group **${g.name}**, primary: **${g.primary}**.${g.locations ? ` Reported locations: ${g.locations.join(', ')}.` : ''}`
    };
  })
  .build();
