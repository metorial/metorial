import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let groupSystemSchema = z.object({
  systemId: z.number().describe('System ID'),
  name: z.string().describe('System name')
});

let groupSchema = z.object({
  groupId: z.number().describe('Unique group ID'),
  name: z.string().describe('Group name'),
  systemWildcard: z
    .string()
    .nullable()
    .describe('Wildcard pattern for auto-matching systems by name'),
  systems: z.array(groupSystemSchema).describe('Systems belonging to this group')
});

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `List all groups in Papertrail. Groups are sets of systems (log senders) that can be searched together. Each group includes its member systems and optional wildcard pattern for automatic system matching.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      groups: z.array(groupSchema).describe('Array of groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listGroups();

    let groups = (Array.isArray(data) ? data : []).map((g: any) => ({
      groupId: g.id,
      name: g.name || '',
      systemWildcard: g.system_wildcard ?? null,
      systems: (g.systems || []).map((s: any) => ({
        systemId: s.id,
        name: s.name || ''
      }))
    }));

    return {
      output: { groups },
      message: `Found **${groups.length}** group(s).`
    };
  })
  .build();

export let getGroup = SlateTool.create(spec, {
  name: 'Get Group',
  key: 'get_group',
  description: `Get details of a specific group including its member systems and wildcard configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z.number().describe('ID of the group to retrieve')
    })
  )
  .output(groupSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let g = await client.getGroup(ctx.input.groupId);

    return {
      output: {
        groupId: g.id,
        name: g.name || '',
        systemWildcard: g.system_wildcard ?? null,
        systems: (g.systems || []).map((s: any) => ({
          systemId: s.id,
          name: s.name || ''
        }))
      },
      message: `Retrieved group **${g.name}** with **${(g.systems || []).length}** system(s).`
    };
  })
  .build();

export let createGroup = SlateTool.create(spec, {
  name: 'Create Group',
  key: 'create_group',
  description: `Create a new group of systems. Groups can include specific systems by ID and/or use a wildcard pattern to automatically include matching systems by name (e.g., \`*prod*\`).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new group'),
      systemWildcard: z
        .string()
        .optional()
        .describe('Wildcard pattern to auto-match systems (e.g., *prod*)'),
      systemIds: z
        .array(z.number())
        .optional()
        .describe('IDs of systems to add as static members')
    })
  )
  .output(groupSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let g = await client.createGroup({
      name: ctx.input.name,
      systemWildcard: ctx.input.systemWildcard,
      systemIds: ctx.input.systemIds
    });

    return {
      output: {
        groupId: g.id,
        name: g.name || '',
        systemWildcard: g.system_wildcard ?? null,
        systems: (g.systems || []).map((s: any) => ({
          systemId: s.id,
          name: s.name || ''
        }))
      },
      message: `Created group **${g.name}** (ID: ${g.id}).`
    };
  })
  .build();

export let updateGroup = SlateTool.create(spec, {
  name: 'Update Group',
  key: 'update_group',
  description: `Update a group's name or wildcard pattern. To add or remove systems from a group, use the "Manage Group Membership" tool instead.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      groupId: z.number().describe('ID of the group to update'),
      name: z.string().optional().describe('New group name'),
      systemWildcard: z
        .string()
        .optional()
        .describe('New wildcard pattern for auto-matching systems')
    })
  )
  .output(groupSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let g = await client.updateGroup(ctx.input.groupId, {
      name: ctx.input.name,
      systemWildcard: ctx.input.systemWildcard
    });

    return {
      output: {
        groupId: g.id,
        name: g.name || '',
        systemWildcard: g.system_wildcard ?? null,
        systems: (g.systems || []).map((s: any) => ({
          systemId: s.id,
          name: s.name || ''
        }))
      },
      message: `Updated group **${g.name}** (ID: ${g.id}).`
    };
  })
  .build();

export let deleteGroup = SlateTool.create(spec, {
  name: 'Delete Group',
  key: 'delete_group',
  description: `Delete a group from Papertrail. The systems within the group are not deleted, only the grouping is removed.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      groupId: z.number().describe('ID of the group to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteGroup(ctx.input.groupId);

    return {
      output: { deleted: true },
      message: `Deleted group with ID **${ctx.input.groupId}**.`
    };
  })
  .build();

export let manageGroupMembership = SlateTool.create(spec, {
  name: 'Manage Group Membership',
  key: 'manage_group_membership',
  description: `Add or remove a system from a group. A system can belong to multiple groups simultaneously.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      systemId: z.number().describe('ID of the system to add or remove'),
      groupId: z.number().describe('ID of the target group'),
      action: z
        .enum(['join', 'leave'])
        .describe('Whether to add (join) or remove (leave) the system')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'join') {
      await client.joinGroup(ctx.input.systemId, ctx.input.groupId);
    } else {
      await client.leaveGroup(ctx.input.systemId, ctx.input.groupId);
    }

    let actionLabel = ctx.input.action === 'join' ? 'added to' : 'removed from';
    return {
      output: { success: true },
      message: `System **${ctx.input.systemId}** ${actionLabel} group **${ctx.input.groupId}**.`
    };
  })
  .build();
