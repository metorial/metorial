import { SlateTool } from 'slates';
import { z } from 'zod';
import { FivetranClient } from '../lib/client';
import { spec } from '../spec';

let groupOutputSchema = z.object({
  groupId: z.string().describe('Unique identifier of the group'),
  name: z.string().describe('Name of the group'),
  createdAt: z.string().optional().describe('Timestamp when the group was created')
});

export let getGroup = SlateTool.create(spec, {
  name: 'Get Group',
  key: 'get_group',
  description: `Retrieve details of a specific group, including its connections and users.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the group to retrieve'),
      includeConnections: z
        .boolean()
        .optional()
        .default(false)
        .describe('Also list all connections in this group'),
      includeUsers: z
        .boolean()
        .optional()
        .default(false)
        .describe('Also list all users in this group')
    })
  )
  .output(
    z.object({
      group: groupOutputSchema,
      connections: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Connections in the group (if requested)'),
      users: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Users in the group (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    let g = await client.getGroup(ctx.input.groupId);

    let group = {
      groupId: g.id,
      name: g.name,
      createdAt: g.created_at
    };

    let connections: any[] | undefined;
    let users: any[] | undefined;

    if (ctx.input.includeConnections) {
      connections = await client.listGroupConnections(ctx.input.groupId);
    }
    if (ctx.input.includeUsers) {
      users = await client.listGroupUsers(ctx.input.groupId);
    }

    return {
      output: { group, connections, users },
      message: `Retrieved group **${group.name}** (${group.groupId}).`
    };
  })
  .build();

export let createGroup = SlateTool.create(spec, {
  name: 'Create Group',
  key: 'create_group',
  description: `Create a new group. Groups are organizational containers for destinations, connectors, and users.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new group')
    })
  )
  .output(groupOutputSchema)
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    let g = await client.createGroup(ctx.input.name);

    return {
      output: {
        groupId: g.id,
        name: g.name,
        createdAt: g.created_at
      },
      message: `Created group **${g.name}** (${g.id}).`
    };
  })
  .build();

export let updateGroup = SlateTool.create(spec, {
  name: 'Update Group',
  key: 'update_group',
  description: `Update an existing group's name.`
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the group to update'),
      name: z.string().describe('New name for the group')
    })
  )
  .output(groupOutputSchema)
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    let g = await client.updateGroup(ctx.input.groupId, ctx.input.name);

    return {
      output: {
        groupId: g.id,
        name: g.name,
        createdAt: g.created_at
      },
      message: `Updated group to **${g.name}** (${g.id}).`
    };
  })
  .build();

export let deleteGroup = SlateTool.create(spec, {
  name: 'Delete Group',
  key: 'delete_group',
  description: `Delete a group and all its associated resources (destination, connectors, etc.).`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the group to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    await client.deleteGroup(ctx.input.groupId);

    return {
      output: { success: true },
      message: `Deleted group ${ctx.input.groupId}.`
    };
  })
  .build();
