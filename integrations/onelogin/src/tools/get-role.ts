import { SlateTool } from 'slates';
import { z } from 'zod';
import { OneLoginClient } from '../lib/client';
import { spec } from '../spec';

export const getRole = SlateTool.create(spec, {
  name: 'Get Role',
  key: 'get_role',
  description:
    'Read the native base role by its exact numeric ID. This response contains its ID and name; role users, apps and administrators require separate OneLogin association endpoints.',
  tags: { readOnly: true }
})
  .input(z.object({ roleId: z.number().describe('Exact role ID from List Roles') }))
  .output(z.object({ roleId: z.number(), name: z.string() }))
  .handleInvocation(async ctx => {
    const role = await OneLoginClient.fromContext(ctx).getRole(ctx.input.roleId);
    return {
      output: { roleId: role.id, name: role.name },
      message: `Retrieved role ${role.id}.`
    };
  });
