import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';

let aclRoleSchema = z.object({
  roleId: z.number().describe('ACL role ID'),
  name: z.string().describe('Role name'),
  redisRules: z.array(z.any()).optional().describe('Associated Redis ACL rules'),
  users: z.array(z.any()).optional().describe('Users assigned to this role')
});

export let listAclRoles = SlateTool.create(spec, {
  name: 'List ACL Roles',
  key: 'list_acl_roles',
  description: `List all ACL roles in the account. Roles group ACL rules and associate them with databases for role-based access control.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      roles: z.array(aclRoleSchema).describe('List of ACL roles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let data = await client.listAclRoles();
    let rawRoles = data?.roles || data || [];
    if (!Array.isArray(rawRoles)) rawRoles = [];

    let roles = rawRoles.map((r: any) => ({
      roleId: r.id,
      name: r.name,
      redisRules: r.redisRules,
      users: r.users
    }));

    return {
      output: { roles },
      message: `Found **${roles.length}** ACL role(s).`
    };
  })
  .build();

export let createAclRole = SlateTool.create(spec, {
  name: 'Create ACL Role',
  key: 'create_acl_role',
  description: `Create a new ACL role that groups Redis rules and associates them with specific databases. Roles enable role-based access control (RBAC).`
})
  .input(
    z.object({
      name: z.string().describe('Role name'),
      redisRules: z
        .array(
          z.object({
            ruleName: z.string().describe('Name of an existing ACL rule'),
            databases: z
              .array(
                z.object({
                  subscriptionId: z.number().describe('Subscription ID'),
                  databaseId: z.number().describe('Database ID'),
                  regions: z
                    .array(z.string())
                    .optional()
                    .describe('Regions where the rule applies')
                })
              )
              .describe('Databases to associate with this rule')
          })
        )
        .describe('Redis ACL rules and their database associations')
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
    let result = await client.createAclRole({
      name: ctx.input.name,
      redisRules: ctx.input.redisRules
    });

    let taskId = String(result?.taskId || result?.taskID || '');

    return {
      output: { taskId, raw: result },
      message: `ACL role **${ctx.input.name}** creation initiated. Task ID: **${taskId}**.`
    };
  })
  .build();

export let updateAclRole = SlateTool.create(spec, {
  name: 'Update ACL Role',
  key: 'update_acl_role',
  description: `Update an existing ACL role. Modify the name and/or associated Redis rules and database mappings.`
})
  .input(
    z.object({
      roleId: z.number().describe('ACL role ID to update'),
      name: z.string().optional().describe('Updated role name'),
      redisRules: z
        .array(
          z.object({
            ruleName: z.string().describe('Name of an existing ACL rule'),
            databases: z
              .array(
                z.object({
                  subscriptionId: z.number().describe('Subscription ID'),
                  databaseId: z.number().describe('Database ID'),
                  regions: z
                    .array(z.string())
                    .optional()
                    .describe('Regions where the rule applies')
                })
              )
              .describe('Databases to associate with this rule')
          })
        )
        .optional()
        .describe('Updated Redis ACL rules and database associations')
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
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.redisRules !== undefined) body.redisRules = ctx.input.redisRules;

    let result = await client.updateAclRole(ctx.input.roleId, body);
    let taskId = String(result?.taskId || result?.taskID || '');

    return {
      output: { taskId, raw: result },
      message: `ACL role **${ctx.input.roleId}** update initiated. Task ID: **${taskId}**.`
    };
  })
  .build();

export let deleteAclRole = SlateTool.create(spec, {
  name: 'Delete ACL Role',
  key: 'delete_acl_role',
  description: `Delete an ACL role by ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      roleId: z.number().describe('ACL role ID to delete')
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
    let result = await client.deleteAclRole(ctx.input.roleId);
    let taskId = String(result?.taskId || result?.taskID || '');

    return {
      output: { taskId, raw: result },
      message: `ACL role **${ctx.input.roleId}** deletion initiated. Task ID: **${taskId}**.`
    };
  })
  .build();
