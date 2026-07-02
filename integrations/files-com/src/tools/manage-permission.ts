import { SlateTool } from 'slates';
import { z } from 'zod';
import { FilesComClient } from '../lib/client';
import { spec } from '../spec';

export let managePermission = SlateTool.create(spec, {
  name: 'Manage Permission',
  key: 'manage_permission',
  description: `List, create, or delete folder-level permissions for users and groups. Permissions control access to folders with levels: admin, full, readonly, writeonly, list, and history. Permissions can be recursive to apply to subfolders.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform'),
      permissionId: z.number().optional().describe('Permission ID (required for delete)'),
      path: z
        .string()
        .optional()
        .describe(
          'Folder path to set permission on (required for create, optional filter for list)'
        ),
      permission: z
        .enum(['admin', 'full', 'readonly', 'writeonly', 'list', 'history'])
        .optional()
        .describe('Permission level (required for create)'),
      recursive: z.boolean().optional().describe('Apply to subfolders (for create)'),
      userId: z.number().optional().describe('User ID to grant permission to'),
      groupId: z.number().optional().describe('Group ID to grant permission to'),
      username: z.string().optional().describe('Username to grant permission to'),
      includeGroups: z
        .boolean()
        .optional()
        .describe('Include inherited group permissions (for list)'),
      cursor: z.string().optional().describe('Pagination cursor'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      permissions: z
        .array(
          z.object({
            permissionId: z.number().describe('Permission ID'),
            path: z.string().describe('Folder path'),
            permission: z.string().describe('Permission level'),
            recursive: z.boolean().optional().describe('Applies to subfolders'),
            userId: z.number().optional().describe('User ID'),
            username: z.string().optional().describe('Username'),
            groupId: z.number().optional().describe('Group ID'),
            groupName: z.string().optional().describe('Group name')
          })
        )
        .optional()
        .describe('List of permissions'),
      created: z
        .object({
          permissionId: z.number().describe('Permission ID'),
          path: z.string().describe('Folder path'),
          permission: z.string().describe('Permission level')
        })
        .optional()
        .describe('Created permission'),
      deleted: z.boolean().optional().describe('Whether permission was deleted'),
      nextCursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FilesComClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listPermissions({
        path: ctx.input.path,
        userId: ctx.input.userId,
        groupId: ctx.input.groupId,
        includeGroups: ctx.input.includeGroups,
        cursor: ctx.input.cursor,
        perPage: ctx.input.perPage
      });

      let permissions = result.permissions.map((p: Record<string, unknown>) => ({
        permissionId: Number(p.id),
        path: String(p.path ?? ''),
        permission: String(p.permission ?? ''),
        recursive: typeof p.recursive === 'boolean' ? p.recursive : undefined,
        userId: typeof p.user_id === 'number' ? p.user_id : undefined,
        username: p.username ? String(p.username) : undefined,
        groupId: typeof p.group_id === 'number' ? p.group_id : undefined,
        groupName: p.group_name ? String(p.group_name) : undefined
      }));

      return {
        output: { permissions, nextCursor: result.cursor },
        message: `Found **${permissions.length}** permissions${ctx.input.path ? ` for path \`${ctx.input.path}\`` : ''}`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.permissionId) throw new Error('permissionId is required for delete');
      await client.deletePermission(ctx.input.permissionId);
      return {
        output: { deleted: true },
        message: `Deleted permission **${ctx.input.permissionId}**`
      };
    }

    // create
    if (!ctx.input.path) throw new Error('path is required for create');
    if (!ctx.input.permission) throw new Error('permission is required for create');

    let data: Record<string, unknown> = {
      path: ctx.input.path,
      permission: ctx.input.permission
    };
    if (ctx.input.recursive !== undefined) data.recursive = ctx.input.recursive;
    if (ctx.input.userId !== undefined) data.user_id = ctx.input.userId;
    if (ctx.input.groupId !== undefined) data.group_id = ctx.input.groupId;
    if (ctx.input.username !== undefined) data.username = ctx.input.username;

    let result = await client.createPermission(data);
    return {
      output: {
        created: {
          permissionId: Number(result.id),
          path: String(result.path ?? ctx.input.path),
          permission: String(result.permission ?? ctx.input.permission)
        }
      },
      message: `Created **${ctx.input.permission}** permission on \`${ctx.input.path}\``
    };
  })
  .build();
