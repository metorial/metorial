import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let managePermissions = SlateTool.create(spec, {
  name: 'Manage Permissions',
  key: 'manage_permissions',
  description: `Grant or revoke access permissions for users or groups on Retool objects (apps, folders, resources, resource configurations). Supports access levels: **use**, **edit**, and **own**.`,
  instructions: [
    'Granting/revoking folder permissions also applies to all objects directly under the folder, but NOT to subfolders and their nested objects.'
  ],
  constraints: [
    'Requires the relevant read or write API token scope and support in this deployment.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['grant', 'revoke'])
        .describe('Whether to grant or revoke the permission'),
      subjectType: z
        .enum(['user', 'group'])
        .describe('Type of the subject receiving/losing access'),
      subjectId: z.string().describe('ID of the user or group'),
      objectType: z
        .enum(['app', 'folder', 'resource', 'resource_configuration', 'workflow', 'agent'])
        .describe('Type of the object being granted/revoked access to'),
      objectId: z.string().describe('ID of the object'),
      accessLevel: z
        .enum(['use', 'edit', 'own'])
        .describe(
          'The access level to grant. For revoke, retained for compatibility; the native operation removes all access to the object.'
        )
    })
  )
  .output(
    z.object({
      action: z.string(),
      subjectType: z.string(),
      subjectId: z.string(),
      objectType: z.string(),
      objectId: z.string(),
      accessLevel: z.string(),
      revokesAllAccess: z.boolean().optional(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let permData = {
      subjectType: ctx.input.subjectType,
      subjectId: ctx.input.subjectId,
      objectType: ctx.input.objectType,
      objectId: ctx.input.objectId,
      accessLevel: ctx.input.accessLevel
    };

    if (ctx.input.action === 'grant') {
      await client.grantPermission(permData);
    } else {
      await client.revokePermission(permData);
    }

    return {
      output: {
        action: ctx.input.action,
        subjectType: ctx.input.subjectType,
        subjectId: ctx.input.subjectId,
        objectType: ctx.input.objectType,
        objectId: ctx.input.objectId,
        accessLevel: ctx.input.accessLevel,
        success: true,
        revokesAllAccess: ctx.input.action === 'revoke'
      },
      message:
        ctx.input.action === 'grant'
          ? `Granted **${ctx.input.accessLevel}** access on the requested object.`
          : 'Revoked all direct access on the requested object and its direct children where applicable.'
    };
  })
  .build();
