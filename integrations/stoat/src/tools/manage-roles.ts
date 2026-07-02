import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createRole = SlateTool.create(spec, {
  name: 'Create Role',
  key: 'create_role',
  description: `Create a new role in a Revolt server with a name and optional rank for hierarchy ordering.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      serverId: z.string().describe('ID of the server to create the role in'),
      name: z.string().describe('Name for the new role'),
      rank: z.number().optional().describe('Rank for role hierarchy (lower = higher priority)')
    })
  )
  .output(
    z.object({
      roleId: z.string().describe('ID of the created role'),
      name: z.string().describe('Name of the role')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.createRole(ctx.input.serverId, {
      name: ctx.input.name,
      rank: ctx.input.rank
    });

    return {
      output: {
        roleId: result.id,
        name: ctx.input.name
      },
      message: `Created role **${ctx.input.name}** (\`${result.id}\`) in server \`${ctx.input.serverId}\``
    };
  })
  .build();

export let editRole = SlateTool.create(spec, {
  name: 'Edit Role',
  key: 'edit_role',
  description: `Edit a role's properties in a Revolt server including name, colour, hoist status, and rank. Only fields provided will be updated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      serverId: z.string().describe('ID of the server'),
      roleId: z.string().describe('ID of the role to edit'),
      name: z.string().optional().describe('New role name'),
      colour: z
        .string()
        .optional()
        .describe('Role colour (CSS-compatible string, e.g. "#ff0000")'),
      hoist: z
        .boolean()
        .optional()
        .describe('Whether the role should be displayed separately in the member list'),
      rank: z.number().optional().describe('Role hierarchy rank (lower = higher priority)'),
      removeFields: z
        .array(z.enum(['Colour']))
        .optional()
        .describe('Fields to remove/clear')
    })
  )
  .output(
    z.object({
      roleId: z.string().describe('ID of the edited role'),
      name: z.string().describe('Updated role name')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.editRole(ctx.input.serverId, ctx.input.roleId, {
      name: ctx.input.name,
      colour: ctx.input.colour,
      hoist: ctx.input.hoist,
      rank: ctx.input.rank,
      remove: ctx.input.removeFields
    });

    return {
      output: {
        roleId: ctx.input.roleId,
        name: result.name
      },
      message: `Updated role **${result.name}** (\`${ctx.input.roleId}\`) in server \`${ctx.input.serverId}\``
    };
  })
  .build();

export let deleteRole = SlateTool.create(spec, {
  name: 'Delete Role',
  key: 'delete_role',
  description: `Delete a role from a Revolt server. Members with this role will lose it.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      serverId: z.string().describe('ID of the server'),
      roleId: z.string().describe('ID of the role to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    await client.deleteRole(ctx.input.serverId, ctx.input.roleId);

    return {
      output: { success: true },
      message: `Deleted role \`${ctx.input.roleId}\` from server \`${ctx.input.serverId}\``
    };
  })
  .build();
