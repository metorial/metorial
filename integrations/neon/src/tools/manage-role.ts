import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeonClient } from '../lib/client';
import { spec } from '../spec';

let roleSchema = z.object({
  branchId: z.string().describe('Branch the role belongs to'),
  name: z.string().describe('Name of the role'),
  protected: z.boolean().optional().describe('Whether the role is protected from deletion'),
  createdAt: z.string().describe('Timestamp when the role was created'),
  updatedAt: z.string().describe('Timestamp when the role was last updated')
});

export let listRoles = SlateTool.create(spec, {
  name: 'List Roles',
  key: 'list_roles',
  description: `Lists all database roles on a specific branch. Roles control database access and permissions. They are copied to child branches upon creation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      branchId: z.string().describe('ID of the branch to list roles for')
    })
  )
  .output(
    z.object({
      roles: z.array(roleSchema).describe('List of database roles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.listRoles(ctx.input.projectId, ctx.input.branchId);

    let roles = (result.roles || []).map((r: any) => ({
      branchId: r.branch_id,
      name: r.name,
      protected: r.protected,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    return {
      output: { roles },
      message: `Found **${roles.length}** role(s) on branch \`${ctx.input.branchId}\`.`
    };
  })
  .build();

export let createRole = SlateTool.create(spec, {
  name: 'Create Role',
  key: 'create_role',
  description: `Creates a new database role on a branch. The role will be available for database access and can be assigned as a database owner.`
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      branchId: z.string().describe('ID of the branch to create the role on'),
      name: z.string().describe('Name for the new role')
    })
  )
  .output(
    z.object({
      branchId: z.string().describe('Branch the role was created on'),
      name: z.string().describe('Name of the created role'),
      password: z.string().optional().describe('Generated password for the new role'),
      createdAt: z.string().describe('Timestamp when the role was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.createRole(ctx.input.projectId, ctx.input.branchId, {
      name: ctx.input.name
    });

    let r = result.role;

    return {
      output: {
        branchId: r.branch_id,
        name: r.name,
        password: r.password,
        createdAt: r.created_at
      },
      message: `Created role **${r.name}** on branch \`${r.branch_id}\`.`
    };
  })
  .build();

export let deleteRole = SlateTool.create(spec, {
  name: 'Delete Role',
  key: 'delete_role',
  description: `Deletes a database role from a branch. The role must not own any databases.`,
  constraints: [
    'Cannot delete protected roles.',
    'The role must not be the owner of any databases.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      branchId: z.string().describe('ID of the branch containing the role'),
      roleName: z.string().describe('Name of the role to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the role was successfully deleted'),
      roleName: z.string().describe('Name of the deleted role')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    await client.deleteRole(ctx.input.projectId, ctx.input.branchId, ctx.input.roleName);

    return {
      output: {
        deleted: true,
        roleName: ctx.input.roleName
      },
      message: `Deleted role **${ctx.input.roleName}** from branch \`${ctx.input.branchId}\`.`
    };
  })
  .build();

export let resetRolePassword = SlateTool.create(spec, {
  name: 'Reset Role Password',
  key: 'reset_role_password',
  description: `Resets the password for a database role. Returns the new generated password. Use this when credentials need to be rotated or if the current password has been lost.`
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      branchId: z.string().describe('ID of the branch containing the role'),
      roleName: z.string().describe('Name of the role whose password to reset')
    })
  )
  .output(
    z.object({
      name: z.string().describe('Name of the role'),
      password: z.string().optional().describe('New generated password for the role')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.resetRolePassword(
      ctx.input.projectId,
      ctx.input.branchId,
      ctx.input.roleName
    );
    let r = result.role;

    return {
      output: {
        name: r.name,
        password: r.password
      },
      message: `Password reset for role **${r.name}** on branch \`${ctx.input.branchId}\`.`
    };
  })
  .build();
