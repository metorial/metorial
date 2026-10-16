import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let setPermissions = SlateTool.create(spec, {
  name: 'Set Permissions',
  key: 'set_permissions',
  description:
    'Set server or channel permissions for a role or all members. Replaces the selected permission values; requires permission management access.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      target: z.enum(['server', 'channel']).describe('Resource whose permissions to change'),
      targetId: z
        .string()
        .describe(
          'Server or channel ID. Use fetch_server or fetch_channel to inspect the resource first.'
        ),
      roleId: z.string().optional().describe('Role ID; omit for default member permissions'),
      permissions: z
        .number()
        .optional()
        .describe(
          'Default permission bitfield for a server or group channel. Cannot be combined with allow or deny.'
        ),
      allow: z
        .number()
        .optional()
        .describe(
          'Allowed permission bitfield for a role or server channel default. Requires deny.'
        ),
      deny: z
        .number()
        .optional()
        .describe(
          'Denied permission bitfield for a role or server channel default. Requires allow.'
        )
    })
  )
  .output(z.object({ success: z.boolean() }))
  .handleInvocation(async ctx => {
    let { target, targetId, roleId, permissions, allow, deny } = ctx.input;
    for (let value of [permissions, allow, deny]) {
      if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) {
        throw createApiServiceError(
          'Permission values must be non-negative safe whole numbers.'
        );
      }
    }
    let client = createClient(ctx);
    if (permissions !== undefined) {
      if (roleId !== undefined || allow !== undefined || deny !== undefined) {
        throw createApiServiceError(
          'Use permissions only for default server or group permissions, without a role, allow, or deny.'
        );
      }
      if (target === 'server') await client.setDefaultPermission(targetId, permissions);
      else await client.setChannelDefaultPermission(targetId, permissions);
    } else {
      if (allow === undefined || deny === undefined) {
        throw createApiServiceError('Provide both allow and deny for a permission override.');
      }
      if (target === 'server') {
        if (!roleId)
          throw createApiServiceError(
            'A roleId is required for server permission overrides; use permissions for server defaults.'
          );
        await client.setRolePermission(targetId, roleId, { allow, deny });
      } else if (roleId !== undefined) {
        await client.setChannelRolePermission(targetId, roleId, { allow, deny });
      } else {
        await client.setChannelDefaultPermission(targetId, { allow, deny });
      }
    }
    return { output: { success: true }, message: 'Permissions updated.' };
  })
  .build();
