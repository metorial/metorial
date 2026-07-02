import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppVeyorClient } from '../lib/client';
import { spec } from '../spec';

export let manageUsers = SlateTool.create(spec, {
  name: 'Manage Users',
  key: 'manage_users',
  description: `List, get, create, update, or delete users within the AppVeyor account. Users are members of the account with assigned roles.`,
  instructions: [
    'For **list**: no additional parameters needed.',
    'For **get**: provide userId.',
    'For **create**: provide fullName, email, and roleId. Set generatePassword to true or provide password.',
    'For **update**: provide userId and any fields to update.',
    'For **delete**: provide userId.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      userId: z.number().optional().describe('User ID (required for get, update, delete)'),
      fullName: z.string().optional().describe('User full name (required for create)'),
      email: z.string().optional().describe('User email (required for create)'),
      roleId: z.number().optional().describe('Role ID to assign (required for create)'),
      generatePassword: z.boolean().optional().describe('Auto-generate password on create'),
      password: z.string().optional().describe('Password for create/update'),
      userSettings: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional user settings for update')
    })
  )
  .output(
    z.object({
      users: z.array(z.record(z.string(), z.unknown())).optional().describe('List of users'),
      user: z.record(z.string(), z.unknown()).optional().describe('User details'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppVeyorClient({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    switch (ctx.input.action) {
      case 'list': {
        let users = await client.listUsers();
        return {
          output: { users, success: true },
          message: `Found **${users.length}** user(s).`
        };
      }

      case 'get': {
        if (ctx.input.userId === undefined) {
          throw new Error('userId is required for get');
        }
        let user = await client.getUser(ctx.input.userId);
        return {
          output: { user, success: true },
          message: `Retrieved user **${ctx.input.userId}**.`
        };
      }

      case 'create': {
        if (!ctx.input.fullName || !ctx.input.email || ctx.input.roleId === undefined) {
          throw new Error('fullName, email, and roleId are required for create');
        }
        await client.createUser({
          fullName: ctx.input.fullName,
          email: ctx.input.email,
          roleId: ctx.input.roleId,
          generatePassword: ctx.input.generatePassword,
          password: ctx.input.password,
          confirmPassword: ctx.input.password
        });
        return {
          output: { success: true },
          message: `Created user **${ctx.input.fullName}** (${ctx.input.email}).`
        };
      }

      case 'update': {
        if (ctx.input.userId === undefined) {
          throw new Error('userId is required for update');
        }
        let updateBody: Record<string, unknown> = {
          userId: ctx.input.userId,
          ...(ctx.input.userSettings || {})
        };
        if (ctx.input.fullName) updateBody.fullName = ctx.input.fullName;
        if (ctx.input.email) updateBody.email = ctx.input.email;
        if (ctx.input.roleId !== undefined) updateBody.roleId = ctx.input.roleId;
        if (ctx.input.password) {
          updateBody.password = ctx.input.password;
          updateBody.confirmPassword = ctx.input.password;
        }
        await client.updateUser(updateBody);
        return {
          output: { success: true },
          message: `Updated user **${ctx.input.userId}**.`
        };
      }

      case 'delete': {
        if (ctx.input.userId === undefined) {
          throw new Error('userId is required for delete');
        }
        await client.deleteUser(ctx.input.userId);
        return {
          output: { success: true },
          message: `Deleted user **${ctx.input.userId}**.`
        };
      }

      default:
        throw new Error(`Unknown action: ${ctx.input.action}`);
    }
  })
  .build();
