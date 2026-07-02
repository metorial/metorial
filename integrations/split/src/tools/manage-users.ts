import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageUsers = SlateTool.create(spec, {
  name: 'Manage Users',
  key: 'manage_users',
  description: `Invite, list, get, update, or delete users in the Split organization. Supports inviting new users by email, listing all users with filtering, retrieving user details, updating user status, and removing pending users.`
})
  .input(
    z.object({
      action: z
        .enum(['invite', 'list', 'get', 'update', 'delete'])
        .describe('Action to perform.'),
      userId: z.string().optional().describe('User ID (for get, update, delete).'),
      email: z.string().optional().describe('Email address (for invite, update).'),
      name: z.string().optional().describe('User name (for update).'),
      status: z
        .string()
        .optional()
        .describe(
          'User status filter (for list) or new status (for update). Values: PENDING, ACTIVE, DEACTIVATED.'
        ),
      twoFactorAuth: z.boolean().optional().describe('Two-factor auth setting (for update).'),
      groupIds: z
        .array(z.string())
        .optional()
        .describe('Group IDs to assign the user to (for invite).'),
      limit: z.number().optional().describe('Max results (for list). Defaults to 50.'),
      after: z.string().optional().describe('Pagination cursor (for list).')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string(),
            email: z.string(),
            userName: z.string(),
            status: z.string(),
            twoFactorAuth: z.boolean(),
            groups: z.array(z.object({ groupId: z.string() }))
          })
        )
        .optional(),
      user: z
        .object({
          userId: z.string(),
          email: z.string(),
          userName: z.string(),
          status: z.string(),
          twoFactorAuth: z.boolean(),
          groups: z.array(z.object({ groupId: z.string() }))
        })
        .optional(),
      deleted: z.boolean().optional(),
      nextMarker: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mapUser = (u: any) => ({
      userId: u.id,
      email: u.email,
      userName: u.name ?? '',
      status: u.status,
      twoFactorAuth: u['2fa'] ?? false,
      groups: (u.groups ?? []).map((g: any) => ({ groupId: g.id }))
    });

    switch (ctx.input.action) {
      case 'invite': {
        if (!ctx.input.email) throw new Error('email is required to invite a user.');
        let groups = ctx.input.groupIds?.map(id => ({ id, type: 'group' }));
        let user = await client.inviteUser(ctx.input.email, groups);
        return {
          output: { user: mapUser(user) },
          message: `Invited user **${ctx.input.email}**.`
        };
      }

      case 'list': {
        let result = await client.listUsers({
          limit: ctx.input.limit,
          after: ctx.input.after,
          status: ctx.input.status
        });
        return {
          output: {
            users: result.data.map(mapUser),
            nextMarker: result.nextMarker
          },
          message: `Found **${result.data.length}** users.`
        };
      }

      case 'get': {
        if (!ctx.input.userId) throw new Error('userId is required.');
        let user = await client.getUser(ctx.input.userId);
        return {
          output: { user: mapUser(user) },
          message: `Retrieved user **${user.name ?? user.email}**.`
        };
      }

      case 'update': {
        if (!ctx.input.userId) throw new Error('userId is required.');
        let current = await client.getUser(ctx.input.userId);
        let user = await client.updateUser(ctx.input.userId, {
          email: ctx.input.email ?? current.email,
          name: ctx.input.name ?? current.name,
          status: ctx.input.status ?? current.status,
          '2fa': ctx.input.twoFactorAuth ?? current['2fa'],
          type: 'user'
        });
        return {
          output: { user: mapUser(user) },
          message: `Updated user **${user.name ?? user.email}**.`
        };
      }

      case 'delete': {
        if (!ctx.input.userId) throw new Error('userId is required.');
        await client.deleteUser(ctx.input.userId);
        return {
          output: { deleted: true },
          message: `Deleted user **${ctx.input.userId}** (only pending users can be deleted).`
        };
      }
    }
  })
  .build();
