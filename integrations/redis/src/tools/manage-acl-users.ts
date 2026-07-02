import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';

let aclUserSchema = z.object({
  aclUserId: z.number().describe('ACL user ID'),
  name: z.string().describe('ACL user name'),
  role: z.string().optional().describe('Assigned role name'),
  status: z.string().optional().describe('User status')
});

export let listAclUsers = SlateTool.create(spec, {
  name: 'List ACL Users',
  key: 'list_acl_users',
  description: `List all ACL users in the account. ACL users are database-level users assigned to ACL roles for fine-grained data access control.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      aclUsers: z.array(aclUserSchema).describe('List of ACL users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let data = await client.listAclUsers();
    let rawUsers = data?.users || data || [];
    if (!Array.isArray(rawUsers)) rawUsers = [];

    let aclUsers = rawUsers.map((u: any) => ({
      aclUserId: u.id,
      name: u.name,
      role: u.role,
      status: u.status
    }));

    return {
      output: { aclUsers },
      message: `Found **${aclUsers.length}** ACL user(s).`
    };
  })
  .build();

export let createAclUser = SlateTool.create(spec, {
  name: 'Create ACL User',
  key: 'create_acl_user',
  description: `Create a new ACL user and assign them a role for database-level access control.`
})
  .input(
    z.object({
      name: z.string().describe('ACL user name'),
      role: z.string().describe('Role name to assign'),
      password: z.string().describe('User password for database authentication')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID to track the creation'),
      raw: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let result = await client.createAclUser({
      name: ctx.input.name,
      role: ctx.input.role,
      password: ctx.input.password
    });

    let taskId = String(result?.taskId || result?.taskID || '');

    return {
      output: { taskId, raw: result },
      message: `ACL user **${ctx.input.name}** creation initiated. Task ID: **${taskId}**.`
    };
  })
  .build();

export let updateAclUser = SlateTool.create(spec, {
  name: 'Update ACL User',
  key: 'update_acl_user',
  description: `Update an existing ACL user. Modify the role or password.`
})
  .input(
    z.object({
      aclUserId: z.number().describe('ACL user ID to update'),
      role: z.string().optional().describe('New role name'),
      password: z.string().optional().describe('New password')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID to track the update'),
      raw: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let body: Record<string, any> = {};
    if (ctx.input.role !== undefined) body.role = ctx.input.role;
    if (ctx.input.password !== undefined) body.password = ctx.input.password;

    let result = await client.updateAclUser(ctx.input.aclUserId, body);
    let taskId = String(result?.taskId || result?.taskID || '');

    return {
      output: { taskId, raw: result },
      message: `ACL user **${ctx.input.aclUserId}** update initiated. Task ID: **${taskId}**.`
    };
  })
  .build();

export let deleteAclUser = SlateTool.create(spec, {
  name: 'Delete ACL User',
  key: 'delete_acl_user',
  description: `Delete an ACL user by ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      aclUserId: z.number().describe('ACL user ID to delete')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID to track the deletion'),
      raw: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let result = await client.deleteAclUser(ctx.input.aclUserId);
    let taskId = String(result?.taskId || result?.taskID || '');

    return {
      output: { taskId, raw: result },
      message: `ACL user **${ctx.input.aclUserId}** deletion initiated. Task ID: **${taskId}**.`
    };
  })
  .build();
