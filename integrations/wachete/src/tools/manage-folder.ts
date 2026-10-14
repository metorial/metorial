import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageFolder = SlateTool.create(spec, {
  name: 'Manage Folder',
  key: 'manage_folder',
  description: `Creates, updates, or deletes a folder for organizing monitors.
- To **create** a folder: provide a name and optionally a parentId.
- To **update** a folder: provide the folderId and the new name.
- To **delete** a folder: provide the folderId and set delete to true. This removes the folder, all subfolders, and all monitors within.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      folderId: z
        .string()
        .optional()
        .describe('Folder ID (required for update/delete, omit for create)'),
      name: z
        .string()
        .optional()
        .describe('Folder name (required for create, optional for update)'),
      parentId: z
        .string()
        .optional()
        .describe('Parent folder ID (used when creating or updating)'),
      delete: z
        .boolean()
        .optional()
        .describe('Set to true to delete the folder and all its contents')
    })
  )
  .output(
    z.object({
      folderId: z.string().optional().describe('ID of the created/updated/deleted folder'),
      name: z.string().optional().describe('Folder name'),
      action: z.enum(['created', 'updated', 'deleted']).describe('Action performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.folderId !== undefined && !ctx.input.folderId.trim()) {
      throw createApiServiceError(
        'Provide a nonempty folder ID. Call list_folders to find folder IDs.'
      );
    }
    if (ctx.input.delete && !ctx.input.folderId) {
      throw createApiServiceError('Provide folderId to delete a folder.');
    }
    if (ctx.input.name !== undefined && !ctx.input.name.trim()) {
      throw createApiServiceError('Folder name must not be empty.');
    }
    if (!ctx.input.delete && !ctx.input.folderId && !ctx.input.name?.trim()) {
      throw createApiServiceError('Provide a name to create a folder.');
    }
    if (
      !ctx.input.delete &&
      ctx.input.folderId &&
      ctx.input.name === undefined &&
      ctx.input.parentId === undefined
    ) {
      throw createApiServiceError('Provide a name or parentId to update a folder.');
    }

    if (ctx.input.delete && ctx.input.folderId) {
      await client.deleteFolder(ctx.input.folderId);
      return {
        output: {
          folderId: ctx.input.folderId,
          action: 'deleted' as const
        },
        message: `Deleted folder \`${ctx.input.folderId}\` and all its contents.`
      };
    }

    let result = await client.createOrUpdateFolder({
      id: ctx.input.folderId,
      name: ctx.input.name,
      parentId: ctx.input.parentId
    });

    if (!result.id && !ctx.input.folderId) {
      throw createApiServiceError('Wachete did not return the created folder ID.');
    }

    let action = ctx.input.folderId ? ('updated' as const) : ('created' as const);

    return {
      output: {
        folderId: result.id ?? ctx.input.folderId,
        name: result.name ?? undefined,
        action
      },
      message: `${action === 'created' ? 'Created' : 'Updated'} folder **${result.name}** (ID: \`${result.id}\`).`
    };
  })
  .build();
