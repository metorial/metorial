import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Create, update, retrieve, or remove a user in the organization. Can also list all users. When removing a user, a replacement username is required.`,
  instructions: [
    'When deleting a user, a replacement username must be provided to take over their responsibilities.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      username: z.string().optional().describe('Username (required for get, update, delete)'),
      firstName: z.string().optional().describe('First name (for create or update)'),
      lastName: z.string().optional().describe('Last name (for create or update)'),
      email: z.string().optional().describe('Email address (required for create)'),
      admin: z.boolean().optional().describe('Whether the user should have admin privileges'),
      replacementUsername: z
        .string()
        .optional()
        .describe('Replacement user when deleting (required for delete)')
    })
  )
  .output(
    z.object({
      users: z.array(z.any()).optional().describe('List of users (for list action)'),
      user: z.any().optional().describe('User details (for get, create, update)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      apiId: ctx.auth.apiId,
      token: ctx.auth.token
    });

    switch (ctx.input.action) {
      case 'list': {
        let data = await client.listUsers();
        let users = data?.users ?? [];
        return {
          output: { users },
          message: `Found **${users.length}** user(s).`
        };
      }

      case 'get': {
        let user = await client.getUser(ctx.input.username ?? '');
        return {
          output: { user },
          message: `Retrieved user **${ctx.input.username}**.`
        };
      }

      case 'create': {
        let user = await client.createUser({
          firstName: ctx.input.firstName ?? '',
          lastName: ctx.input.lastName ?? '',
          username: ctx.input.username ?? '',
          email: ctx.input.email ?? '',
          admin: ctx.input.admin
        });
        return {
          output: { user },
          message: `Created user **${ctx.input.username}**.`
        };
      }

      case 'update': {
        let updateData: any = {};
        if (ctx.input.firstName !== undefined) updateData.firstName = ctx.input.firstName;
        if (ctx.input.lastName !== undefined) updateData.lastName = ctx.input.lastName;
        if (ctx.input.email !== undefined) updateData.email = ctx.input.email;
        if (ctx.input.admin !== undefined) updateData.admin = ctx.input.admin;

        let user = await client.updateUser(ctx.input.username ?? '', updateData);
        return {
          output: { user },
          message: `Updated user **${ctx.input.username}**.`
        };
      }

      case 'delete': {
        await client.deleteUser(ctx.input.username ?? '', ctx.input.replacementUsername ?? '');
        return {
          output: {},
          message: `Deleted user **${ctx.input.username}**, replaced by **${ctx.input.replacementUsername}**.`
        };
      }
    }
  })
  .build();
