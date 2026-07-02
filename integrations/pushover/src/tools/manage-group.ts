import { SlateTool } from 'slates';
import { z } from 'zod';
import { PushoverClient } from '../lib/client';
import { spec } from '../spec';

let groupMemberSchema = z.object({
  userKey: z.string().describe('Pushover user key of the group member'),
  device: z.string().describe('Device restriction (empty if none)'),
  memo: z.string().describe('Free-text memo about the member'),
  disabled: z.boolean().describe('Whether the member is temporarily disabled')
});

export let manageGroup = SlateTool.create(spec, {
  name: 'Manage Group',
  key: 'manage_group',
  description: `Create, retrieve, rename, or list delivery groups. Groups allow sending a single notification to multiple users. Use the **action** field to specify the operation.`,
  instructions: [
    'Use action `list` to list all groups for the application.',
    'Use action `create` with a **name** to create a new group.',
    'Use action `get` with a **groupKey** to retrieve group details and members.',
    'Use action `rename` with a **groupKey** and **name** to rename a group.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'get', 'rename'])
        .describe('The group operation to perform'),
      groupKey: z
        .string()
        .optional()
        .describe('Group key (required for get and rename actions)'),
      name: z
        .string()
        .optional()
        .describe('Group name (required for create and rename actions)')
    })
  )
  .output(
    z.object({
      groups: z
        .array(
          z.object({
            groupKey: z.string().describe('Group key identifier'),
            name: z.string().describe('Group name')
          })
        )
        .optional()
        .describe('List of groups (returned by list action)'),
      groupKey: z
        .string()
        .optional()
        .describe('Group key (returned by create and get actions)'),
      groupName: z.string().optional().describe('Group name (returned by get action)'),
      members: z
        .array(groupMemberSchema)
        .optional()
        .describe('Group members (returned by get action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PushoverClient({
      token: ctx.auth.token,
      userKey: ctx.auth.userKey
    });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listGroups();
        return {
          output: {
            groups: result.groups.map(g => ({
              groupKey: g.group,
              name: g.name
            }))
          },
          message: `Found **${result.groups.length}** group(s).`
        };
      }

      case 'create': {
        if (!ctx.input.name) throw new Error('name is required for create action');
        let result = await client.createGroup(ctx.input.name);
        return {
          output: {
            groupKey: result.group
          },
          message: `Created group "${ctx.input.name}" with key \`${result.group}\`.`
        };
      }

      case 'get': {
        if (!ctx.input.groupKey) throw new Error('groupKey is required for get action');
        let result = await client.getGroup(ctx.input.groupKey);
        return {
          output: {
            groupKey: ctx.input.groupKey,
            groupName: result.name,
            members: result.users.map(u => ({
              userKey: u.user,
              device: u.device,
              memo: u.memo,
              disabled: u.disabled
            }))
          },
          message: `Group "${result.name}" has **${result.users.length}** member(s).`
        };
      }

      case 'rename': {
        if (!ctx.input.groupKey) throw new Error('groupKey is required for rename action');
        if (!ctx.input.name) throw new Error('name is required for rename action');
        await client.renameGroup(ctx.input.groupKey, ctx.input.name);
        return {
          output: {
            groupKey: ctx.input.groupKey,
            groupName: ctx.input.name
          },
          message: `Renamed group \`${ctx.input.groupKey}\` to "${ctx.input.name}".`
        };
      }
    }
  })
  .build();
