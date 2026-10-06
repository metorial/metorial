import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientForContext } from '../lib/client';
import { spec } from '../spec';

export let createGroup = SlateTool.create(spec, {
  tags: { readOnly: false },
  name: 'Create Group',
  key: 'create_group',
  description: `Choose an organization with list_organizations. Create a new database group in a specific location. Groups serve as containers for databases and define placement. Replica management is limited to eligible existing paid accounts.`,
  instructions: [
    'Use the "List Locations" tool to discover available locations before creating a group.'
  ]
})
  .input(
    z.object({
      organizationSlug: z
        .string()
        .optional()
        .describe(
          'Organization slug. Call list_organizations to discover authorized organizations; older connections may use their saved organization.'
        ),
      groupName: z.string().describe('Name for the new group'),
      location: z
        .string()
        .describe('Primary location code for the group (e.g., "aws-us-east-1")'),
      extensions: z.string().optional().describe('Extensions to enable (e.g., "all")')
    })
  )
  .output(
    z.object({
      groupName: z.string().describe('Name of the created group'),
      groupUuid: z.string().describe('Unique identifier of the group'),
      locations: z.array(z.string()).optional().describe('Group locations'),
      primary: z.string().describe('Primary location'),
      archived: z.boolean().optional().describe('Whether the group is archived'),
      version: z.string().optional().describe('Group version')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientForContext(ctx);

    let result = await client.createGroup({
      name: ctx.input.groupName,
      location: ctx.input.location,
      extensions: ctx.input.extensions
    });

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
      message: `Created group **${g.name}** in location **${g.primary}**.`
    };
  })
  .build();
