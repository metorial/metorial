import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createGroup = SlateTool.create(spec, {
  name: 'Create Group',
  key: 'create_group',
  description: `Create a new database group in a specific location. Groups serve as containers for databases and handle regional replication.`,
  instructions: [
    'Use the "List Locations" tool to discover available locations before creating a group.'
  ]
})
  .input(
    z.object({
      groupName: z.string().describe('Name for the new group'),
      location: z
        .string()
        .describe('Primary location code for the group (e.g., "iad", "lhr")'),
      extensions: z.string().optional().describe('Extensions to enable (e.g., "all")')
    })
  )
  .output(
    z.object({
      groupName: z.string().describe('Name of the created group'),
      groupUuid: z.string().describe('Unique identifier of the group'),
      locations: z.array(z.string()).describe('Group locations'),
      primary: z.string().describe('Primary location'),
      archived: z.boolean().describe('Whether the group is archived'),
      version: z.string().describe('Group version')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

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
