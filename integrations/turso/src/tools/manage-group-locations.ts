import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientForContext } from '../lib/client';
import { spec } from '../spec';

export let manageGroupLocations = SlateTool.create(spec, {
  tags: { readOnly: false, destructive: true },
  name: 'Manage Group Locations',
  key: 'manage_group_locations',
  description: `Choose an organization with list_organizations. Add or remove replica locations for a database group. Adding a location creates a new replica machine. Removing a location destroys the replica at that location.`,
  instructions: [
    'Use the "List Locations" tool to discover available location codes.',
    'You cannot remove the primary location of a group.',
    'Replica management is available only to eligible existing paid accounts; new accounts do not support this legacy feature.'
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
      groupName: z.string().describe('Name of the group to manage locations for'),
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the location'),
      location: z
        .string()
        .describe('Location code to add or remove (e.g., "iad", "lhr", "nrt")')
    })
  )
  .output(
    z.object({
      groupName: z.string().describe('Name of the group'),
      groupUuid: z.string().describe('Unique identifier of the group'),
      locations: z.array(z.string()).optional().describe('Updated list of group locations'),
      primary: z.string().describe('Primary location')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientForContext(ctx);

    const result =
      ctx.input.action === 'add'
        ? await client.addGroupLocation(ctx.input.groupName, ctx.input.location)
        : await client.removeGroupLocation(ctx.input.groupName, ctx.input.location);

    let g = result.group;

    return {
      output: {
        groupName: g.name,
        groupUuid: g.uuid,
        locations: g.locations,
        primary: g.primary
      },
      message: `${ctx.input.action === 'add' ? 'Added' : 'Removed'} location **${ctx.input.location}** ${ctx.input.action === 'add' ? 'to' : 'from'} group **${g.name}**.${g.locations ? ` Locations: ${g.locations.join(', ')}.` : ''}`
    };
  })
  .build();
