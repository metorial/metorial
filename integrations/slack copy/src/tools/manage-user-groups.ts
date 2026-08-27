import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { missingRequiredFieldError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let userGroupSchema = z.object({
  userGroupId: z.string().describe('User group ID'),
  name: z.string().optional().describe('Group name'),
  handle: z.string().optional().describe('Group mention handle'),
  description: z.string().optional().describe('Group description'),
  userCount: z.number().optional().describe('Number of members'),
  members: z.array(z.string()).optional().describe('Member user IDs'),
  createdBy: z.string().optional().describe('User ID who created the group'),
  dateCreated: z.number().optional().describe('Unix timestamp when the group was created')
});

export let manageUserGroups = SlateTool.create(spec, {
  name: 'Manage User Groups',
  key: 'manage_user_groups',
  description: `Create, update, enable, disable, or list user groups (also known as @mention handle groups) in Slack. Manage group membership by setting the full member list.`,
  instructions: [
    'To **set members**, use the "set_members" action with the full list of user IDs (replaces the existing member list).',
    'The "list_members" action returns user IDs for a specific group.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(slackActionScopes.userGroups)
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'enable', 'disable', 'list', 'set_members', 'list_members'])
        .describe('User group management action'),
      userGroupId: z
        .string()
        .optional()
        .describe(
          'User group ID (required for update/enable/disable/set_members/list_members)'
        ),
      name: z.string().optional().describe('Group name (required for create)'),
      handle: z.string().optional().describe('Group mention handle (e.g. "engineering")'),
      description: z.string().optional().describe('Group description'),
      channels: z.array(z.string()).optional().describe('Default channel IDs for the group'),
      userIds: z
        .array(z.string())
        .optional()
        .describe('Full list of member user IDs (for set_members action)'),
      includeDisabled: z.boolean().optional().describe('Include disabled groups when listing')
    })
  )
  .output(
    z.object({
      userGroup: userGroupSchema.optional().describe('User group details'),
      userGroups: z
        .array(userGroupSchema)
        .optional()
        .describe('List of user groups (for list action)'),
      members: z
        .array(z.string())
        .optional()
        .describe('Member user IDs (for list_members action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let { action } = ctx.input;

    let mapGroup = (g: any) => ({
      userGroupId: g.id,
      name: g.name,
      handle: g.handle,
      description: g.description,
      userCount: g.user_count,
      members: g.users,
      createdBy: g.created_by,
      dateCreated: g.date_create
    });

    if (action === 'create') {
      if (!ctx.input.name) throw missingRequiredFieldError('name', 'create action');
      let group = await client.createUserGroup({
        name: ctx.input.name,
        handle: ctx.input.handle,
        description: ctx.input.description,
        channels: ctx.input.channels
      });
      return {
        output: { userGroup: mapGroup(group) },
        message: `Created user group **@${group.handle || group.name}** (\`${group.id}\`).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.userGroupId) {
        throw missingRequiredFieldError('userGroupId', 'update action');
      }
      let group = await client.updateUserGroup({
        usergroupId: ctx.input.userGroupId,
        name: ctx.input.name,
        handle: ctx.input.handle,
        description: ctx.input.description,
        channels: ctx.input.channels
      });
      return {
        output: { userGroup: mapGroup(group) },
        message: `Updated user group **@${group.handle || group.name}**.`
      };
    }

    if (action === 'enable') {
      if (!ctx.input.userGroupId) {
        throw missingRequiredFieldError('userGroupId', 'enable action');
      }
      let group = await client.enableUserGroup(ctx.input.userGroupId);
      return {
        output: { userGroup: mapGroup(group) },
        message: `Enabled user group \`${ctx.input.userGroupId}\`.`
      };
    }

    if (action === 'disable') {
      if (!ctx.input.userGroupId)
        throw missingRequiredFieldError('userGroupId', 'disable action');
      let group = await client.disableUserGroup(ctx.input.userGroupId);
      return {
        output: { userGroup: mapGroup(group) },
        message: `Disabled user group \`${ctx.input.userGroupId}\`.`
      };
    }

    if (action === 'set_members') {
      if (!ctx.input.userGroupId)
        throw missingRequiredFieldError('userGroupId', 'set_members action');
      if (!ctx.input.userIds) throw missingRequiredFieldError('userIds', 'set_members action');
      let group = await client.updateUserGroupMembers(
        ctx.input.userGroupId,
        ctx.input.userIds
      );
      return {
        output: { userGroup: mapGroup(group) },
        message: `Set ${ctx.input.userIds.length} member(s) for user group \`${ctx.input.userGroupId}\`.`
      };
    }

    if (action === 'list_members') {
      if (!ctx.input.userGroupId)
        throw missingRequiredFieldError('userGroupId', 'list_members action');
      let members = await client.listUserGroupMembers(ctx.input.userGroupId);
      return {
        output: { members },
        message: `Found ${members.length} member(s) in user group \`${ctx.input.userGroupId}\`.`
      };
    }

    // list
    let groups = await client.listUserGroups({
      includeUsers: true,
      includeCount: true,
      includeDisabled: ctx.input.includeDisabled
    });
    return {
      output: { userGroups: groups.map(mapGroup) },
      message: `Listed ${groups.length} user group(s).`
    };
  })
  .build();
