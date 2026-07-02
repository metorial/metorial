import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.number().describe('User ID'),
  name: z.string().optional().describe('User name'),
  email: z.string().optional().describe('User email'),
  role: z.string().optional().describe('Account role (Owner, Manager, Member, Viewer)'),
  status: z.string().optional().describe('User status')
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all account-level users in the Redis Cloud account. Shows user names, emails, roles, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z.array(userSchema).describe('List of account users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let data = await client.listUsers();
    let rawUsers = data?.users || data || [];
    if (!Array.isArray(rawUsers)) rawUsers = [];

    let users = rawUsers.map((u: any) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status
    }));

    return {
      output: { users },
      message: `Found **${users.length}** user(s).`
    };
  })
  .build();

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve details for a single account-level Redis Cloud user by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.number().describe('User ID to retrieve')
    })
  )
  .output(
    z.object({
      user: userSchema.describe('Account user details'),
      raw: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let data = await client.getUser(ctx.input.userId);

    let user = {
      userId: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      status: data.status
    };

    return {
      output: { user, raw: data },
      message: `User **${ctx.input.userId}** retrieved.`
    };
  })
  .build();

export let updateUser = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update an account-level user's settings such as name or role.`
})
  .input(
    z.object({
      userId: z.number().describe('User ID to update'),
      name: z.string().optional().describe('New user name'),
      role: z.string().optional().describe('New role (Owner, Manager, Member, Viewer)')
    })
  )
  .output(
    z.object({
      raw: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.role !== undefined) body.role = ctx.input.role;

    let result = await client.updateUser(ctx.input.userId, body);

    return {
      output: { raw: result },
      message: `User **${ctx.input.userId}** updated.`
    };
  })
  .build();

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Delete an account-level user from the Redis Cloud account.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.number().describe('User ID to delete')
    })
  )
  .output(
    z.object({
      raw: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let result = await client.deleteUser(ctx.input.userId);

    return {
      output: { raw: result },
      message: `User **${ctx.input.userId}** deleted.`
    };
  })
  .build();
