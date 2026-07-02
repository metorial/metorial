import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickHouseClient } from '../lib/client';
import { spec } from '../spec';

let roleSchema = z.object({
  roleId: z.string().describe('Unique role identifier'),
  name: z.string().optional().describe('Role name'),
  type: z.string().optional().describe('Role type'),
  role: z.record(z.string(), z.any()).describe('Raw role object from ClickHouse Cloud')
});

export let listRoles = SlateTool.create(spec, {
  name: 'List Roles',
  key: 'list_roles',
  description: `List organization roles available for assignment to members and API keys.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      roles: z.array(roleSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let roles = await client.listRoles();
    let items = Array.isArray(roles) ? roles : [];

    return {
      output: {
        roles: items.map((role: any) => ({
          roleId: role.id,
          name: role.name,
          type: role.type || role.roleType,
          role
        }))
      },
      message: `Found **${items.length}** roles.`
    };
  })
  .build();

export let getRole = SlateTool.create(spec, {
  name: 'Get Role',
  key: 'get_role',
  description: `Retrieve a ClickHouse Cloud organization role by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      roleId: z.string().describe('ID of the role')
    })
  )
  .output(roleSchema)
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let role = await client.getRole(ctx.input.roleId);

    return {
      output: {
        roleId: role.id || ctx.input.roleId,
        name: role.name,
        type: role.type || role.roleType,
        role
      },
      message: `Retrieved role **${role.name || ctx.input.roleId}**.`
    };
  })
  .build();
