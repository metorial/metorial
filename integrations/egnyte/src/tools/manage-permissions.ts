import { SlateTool } from 'slates';
import { z } from 'zod';
import { EgnyteClient } from '../lib/client';
import { spec } from '../spec';

export let getPermissionsTool = SlateTool.create(spec, {
  name: 'Get Folder Permissions',
  key: 'get_permissions',
  description: `Retrieve the permissions assigned to a folder in Egnyte. Returns user and group permission levels including Owner, Full, Editor, and Viewer. Also indicates whether the folder inherits permissions from its parent.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      folderPath: z.string().describe('Path to the folder (e.g. "/Shared/Projects")')
    })
  )
  .output(
    z.object({
      userPermissions: z
        .record(z.string(), z.string())
        .optional()
        .describe('Map of username to permission level'),
      groupPermissions: z
        .record(z.string(), z.string())
        .optional()
        .describe('Map of group name to permission level'),
      inheritsPermissions: z
        .boolean()
        .optional()
        .describe('Whether the folder inherits permissions from its parent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let result = (await client.getPermissions(ctx.input.folderPath)) as Record<
      string,
      unknown
    >;

    return {
      output: {
        userPermissions: result.userPerms as Record<string, string> | undefined,
        groupPermissions: result.groupPerms as Record<string, string> | undefined,
        inheritsPermissions:
          typeof result.inheritsPermissions === 'boolean'
            ? result.inheritsPermissions
            : undefined
      },
      message: `Retrieved permissions for **${ctx.input.folderPath}**`
    };
  })
  .build();

export let setPermissionsTool = SlateTool.create(spec, {
  name: 'Set Folder Permissions',
  key: 'set_permissions',
  description: `Set or update folder permissions in Egnyte for specific users and/or groups. This is a delta operation — only the specified permissions are changed; existing permissions for other users/groups remain unaffected. Set a permission to "None" to revoke access.`,
  instructions: [
    'Valid permission levels are: Owner, Full, Editor, Viewer, None',
    'Setting "None" removes the permission for that user or group'
  ]
})
  .input(
    z.object({
      folderPath: z.string().describe('Path to the folder'),
      userPermissions: z
        .record(z.string(), z.enum(['Owner', 'Full', 'Editor', 'Viewer', 'None']))
        .optional()
        .describe('Map of username to permission level'),
      groupPermissions: z
        .record(z.string(), z.enum(['Owner', 'Full', 'Editor', 'Viewer', 'None']))
        .optional()
        .describe('Map of group name to permission level'),
      inheritsPermissions: z
        .boolean()
        .optional()
        .describe('Whether the folder should inherit permissions from parent'),
      keepParentPermissions: z
        .boolean()
        .optional()
        .describe('Whether to keep parent permissions when disabling inheritance')
    })
  )
  .output(
    z.object({
      folderPath: z.string(),
      updated: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    await client.setPermissions(ctx.input.folderPath, {
      userPerms: ctx.input.userPermissions,
      groupPerms: ctx.input.groupPermissions,
      inheritsPermissions: ctx.input.inheritsPermissions,
      keepParentPermissions: ctx.input.keepParentPermissions
    });

    let changes: string[] = [];
    if (ctx.input.userPermissions) {
      changes.push(`${Object.keys(ctx.input.userPermissions).length} user(s)`);
    }
    if (ctx.input.groupPermissions) {
      changes.push(`${Object.keys(ctx.input.groupPermissions).length} group(s)`);
    }

    return {
      output: {
        folderPath: ctx.input.folderPath,
        updated: true
      },
      message: `Updated permissions on **${ctx.input.folderPath}** for ${changes.join(' and ') || 'folder settings'}`
    };
  })
  .build();
