import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageUsers = SlateTool.create(spec, {
  name: 'Manage Users',
  key: 'manage_users',
  description: `List, get, invite, update, or remove users from your Celigo account. Use **action** to specify the operation.
- "list": Retrieve all users in the account.
- "get": Retrieve a specific user by ID.
- "invite": Invite a new user by providing their email and role in **userData**.
- "update": Update a user's role or permissions.
- "delete": Remove a user from the account.`
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'invite', 'update', 'delete'])
        .describe('The operation to perform'),
      userId: z
        .string()
        .optional()
        .describe('ID of the user (required for get, update, delete)'),
      userData: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'User data (required for invite and update). For invite, include "email" and role/permission fields.'
        )
    })
  )
  .output(
    z.object({
      users: z.array(z.any()).optional().describe('List of users (for list action)'),
      userId: z.string().optional().describe('ID of the affected user'),
      deleted: z.boolean().optional().describe('Whether the user was deleted'),
      rawResult: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let { action, userId, userData } = ctx.input;

    switch (action) {
      case 'list': {
        let users = await client.listUsers();
        return {
          output: { users },
          message: `Found **${users.length}** user(s).`
        };
      }
      case 'get': {
        if (!userId) throw new Error('userId is required');
        let user = await client.getUser(userId);
        return {
          output: { userId: user._id, rawResult: user },
          message: `Retrieved user **${user.email || user._id}**.`
        };
      }
      case 'invite': {
        if (!userData) throw new Error('userData is required for invite');
        let user = await client.inviteUser(userData);
        return {
          output: { userId: user._id, rawResult: user },
          message: `Invited user **${userData.email || user._id}**.`
        };
      }
      case 'update': {
        if (!userId) throw new Error('userId is required');
        if (!userData) throw new Error('userData is required for update');
        let user = await client.updateUser(userId, userData);
        return {
          output: { userId: user._id, rawResult: user },
          message: `Updated user **${user.email || user._id}**.`
        };
      }
      case 'delete': {
        if (!userId) throw new Error('userId is required');
        await client.deleteUser(userId);
        return {
          output: { userId, deleted: true },
          message: `Removed user **${userId}** from account.`
        };
      }
    }
  })
  .build();
