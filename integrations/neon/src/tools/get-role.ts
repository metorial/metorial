import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeonClient } from '../lib/client';
import { spec } from '../spec';
import { mapRole, roleSchema } from './shared';

export let getRole = SlateTool.create(spec, {
  name: 'Get Role',
  key: 'get_role',
  description: `Retrieves details for a database role on a Neon branch, including protection and authentication metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      branchId: z.string().describe('ID of the branch containing the role'),
      roleName: z.string().describe('Name of the role to retrieve')
    })
  )
  .output(roleSchema)
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.getRole(
      ctx.input.projectId,
      ctx.input.branchId,
      ctx.input.roleName
    );
    let role = mapRole(result.role);

    return {
      output: role,
      message: `Retrieved role **${role.name}** on branch \`${role.branchId}\`.`
    };
  })
  .build();

export let revealRolePassword = SlateTool.create(spec, {
  name: 'Reveal Role Password',
  key: 'reveal_role_password',
  description: `Retrieves the stored password for a Neon database role when password storage is enabled. Use reset_role_password when the password should be rotated instead.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      branchId: z.string().describe('ID of the branch containing the role'),
      roleName: z.string().describe('Name of the role whose password to reveal')
    })
  )
  .output(
    z.object({
      password: z.string().describe('Stored role password')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.revealRolePassword(
      ctx.input.projectId,
      ctx.input.branchId,
      ctx.input.roleName
    );

    return {
      output: {
        password: result.password
      },
      message: `Retrieved stored password for role **${ctx.input.roleName}**.`
    };
  })
  .build();
