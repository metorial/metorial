import { SlateTool } from 'slates';
import { z } from 'zod';
import { EgnyteClient } from '../lib/client';
import { spec } from '../spec';

let groupMemberSchema = z.object({
  username: z.string().optional(),
  memberId: z.number().optional(),
  displayName: z.string().optional()
});

let groupOutputSchema = z.object({
  groupId: z.string().describe('Unique group ID'),
  displayName: z.string().describe('Group display name'),
  members: z.array(groupMemberSchema).optional().describe('Group members')
});

let mapGroup = (g: Record<string, unknown>) => ({
  groupId: String(g.id || ''),
  displayName: String(g.displayName || ''),
  members: Array.isArray(g.members)
    ? g.members.map((m: Record<string, unknown>) => ({
        username: m.username ? String(m.username) : undefined,
        memberId: typeof m.value === 'number' ? m.value : undefined,
        displayName: m.display ? String(m.display) : undefined
      }))
    : undefined
});

export let listGroupsTool = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `List custom groups in your Egnyte domain. Returns group names, IDs, and membership. Default Egnyte groups are not included in the response.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z.string().optional().describe('SCIM filter expression to search groups'),
      startIndex: z.number().optional().describe('1-based index of the first result'),
      count: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      groups: z.array(groupOutputSchema).describe('List of groups'),
      totalResults: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let result = (await client.listGroups({
      filter: ctx.input.filter,
      startIndex: ctx.input.startIndex,
      count: ctx.input.count
    })) as Record<string, unknown>;

    let resources = Array.isArray(result.resources)
      ? result.resources
      : Array.isArray(result.Resources)
        ? result.Resources
        : [];
    let groups = resources.map((g: Record<string, unknown>) => mapGroup(g));

    return {
      output: {
        groups,
        totalResults: typeof result.totalResults === 'number' ? result.totalResults : undefined
      },
      message: `Found **${groups.length}** group(s)`
    };
  })
  .build();

export let createGroupTool = SlateTool.create(spec, {
  name: 'Create Group',
  key: 'create_group',
  description: `Create a new group in your Egnyte domain with optional initial members.`
})
  .input(
    z.object({
      displayName: z.string().describe('Name for the new group'),
      memberIds: z.array(z.number()).optional().describe('User IDs to add as initial members')
    })
  )
  .output(groupOutputSchema)
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let members = ctx.input.memberIds?.map(id => ({ value: id }));
    let result = (await client.createGroup(ctx.input.displayName, members)) as Record<
      string,
      unknown
    >;

    return {
      output: mapGroup(result),
      message: `Created group **${ctx.input.displayName}**${members ? ` with ${members.length} member(s)` : ''}`
    };
  })
  .build();

export let updateGroupTool = SlateTool.create(spec, {
  name: 'Update Group',
  key: 'update_group',
  description: `Update a group in Egnyte. Rename the group and/or replace its member list. When updating members, the provided list replaces the existing membership.`
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the group to update'),
      displayName: z.string().optional().describe('New group name'),
      memberIds: z
        .array(z.number())
        .optional()
        .describe('New member list (replaces existing members). Provide user IDs.')
    })
  )
  .output(groupOutputSchema)
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let body: { displayName?: string; members?: Array<{ value: number }> } = {};
    if (ctx.input.displayName) body.displayName = ctx.input.displayName;
    if (ctx.input.memberIds) body.members = ctx.input.memberIds.map(id => ({ value: id }));

    let result = (await client.updateGroup(ctx.input.groupId, body)) as Record<
      string,
      unknown
    >;

    return {
      output: mapGroup(result),
      message: `Updated group **${ctx.input.groupId}**`
    };
  })
  .build();

export let deleteGroupTool = SlateTool.create(spec, {
  name: 'Delete Group',
  key: 'delete_group',
  description: `Delete a group from your Egnyte domain. This does not delete the users in the group.`,
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
      groupId: z.string(),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    await client.deleteGroup(ctx.input.groupId);

    return {
      output: {
        groupId: ctx.input.groupId,
        deleted: true
      },
      message: `Deleted group **${ctx.input.groupId}**`
    };
  })
  .build();
