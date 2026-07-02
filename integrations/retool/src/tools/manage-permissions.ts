import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let managePermissions = SlateTool.create(spec, {
  name: 'Manage Permissions',
  key: 'manage_permissions',
  description: `Grant or revoke access permissions for users or groups on Retool objects (apps, folders, resources, workflows, agents). Supports access levels: **use**, **edit**, and **own**.`,
  instructions: [
    'Granting/revoking folder permissions also applies to all objects directly under the folder, but NOT to subfolders and their nested objects.'
  ],
  constraints: ['Available on Enterprise Premium plan only.']
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
        .describe('The access level to grant or revoke')
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
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

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
        success: true
      },
      message: `${ctx.input.action === 'grant' ? 'Granted' : 'Revoked'} **${ctx.input.accessLevel}** access for ${ctx.input.subjectType} \`${ctx.input.subjectId}\` on ${ctx.input.objectType} \`${ctx.input.objectId}\`.`
    };
  })
  .build();
