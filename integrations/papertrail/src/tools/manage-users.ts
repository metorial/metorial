import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.number().describe('Unique user ID'),
  email: z.string().describe('User email address')
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all team members on the Papertrail account. Returns each user's ID and email address.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z.array(userSchema).describe('Array of account users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listUsers();

    let users = (Array.isArray(data) ? data : []).map((u: any) => ({
      userId: u.id,
      email: u.email || ''
    }));

    return {
      output: { users },
      message: `Found **${users.length}** user(s).`
    };
  })
  .build();

export let inviteUser = SlateTool.create(spec, {
  name: 'Invite User',
  key: 'invite_user',
  description: `Invite a new team member to the Papertrail account by email. Configure their permission level including read-only access, member management, billing management, log purging, and group access restrictions.`,
  instructions: [
    'If manageMembers or manageBilling is enabled, readOnly is automatically overridden to false (full access granted).',
    'If purgeLogs is enabled but readOnly or canAccessAllGroups is false, purge permission will not be granted.',
    'To restrict access to specific groups, set canAccessAllGroups to false and provide groupIds.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the user to invite'),
      readOnly: z.boolean().optional().describe('Grant read-only access (default: false)'),
      manageMembers: z.boolean().optional().describe('Allow managing other team members'),
      manageBilling: z.boolean().optional().describe('Allow managing account billing'),
      purgeLogs: z.boolean().optional().describe('Allow purging log events'),
      canAccessAllGroups: z
        .boolean()
        .optional()
        .describe('Grant access to all groups (false to restrict)'),
      groupIds: z
        .array(z.number())
        .optional()
        .describe('Specific group IDs to grant access to (when canAccessAllGroups is false)')
    })
  )
  .output(
    z.object({
      invited: z.boolean().describe('Whether the invitation was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.inviteUser({
      email: ctx.input.email,
      readOnly: ctx.input.readOnly,
      manageMembers: ctx.input.manageMembers,
      manageBilling: ctx.input.manageBilling,
      purgeLogs: ctx.input.purgeLogs,
      canAccessAllGroups: ctx.input.canAccessAllGroups,
      groupIds: ctx.input.groupIds
    });

    return {
      output: { invited: true },
      message: `Invitation sent to **${ctx.input.email}**.`
    };
  })
  .build();

export let removeUser = SlateTool.create(spec, {
  name: 'Remove User',
  key: 'remove_user',
  description: `Remove a team member from the Papertrail account. This revokes their access immediately.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.number().describe('ID of the user to remove')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the removal was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteUser(ctx.input.userId);

    return {
      output: { deleted: true },
      message: `Removed user with ID **${ctx.input.userId}**.`
    };
  })
  .build();
