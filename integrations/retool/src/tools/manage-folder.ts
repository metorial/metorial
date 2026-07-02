import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageFolder = SlateTool.create(spec, {
  name: 'Manage Folder',
  key: 'manage_folder',
  description: `Create, update, or delete a folder in the Retool organization. Folders organize apps and resources into a hierarchy.`,
  instructions: [
    'Use action "create" to create a new folder, "update" to rename or move it, or "delete" to remove it.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      folderId: z.string().optional().describe('Folder ID (required for update and delete)'),
      folderName: z
        .string()
        .optional()
        .describe('Name of the folder (required for create, optional for update)'),
      parentFolderId: z
        .string()
        .nullable()
        .optional()
        .describe('Parent folder ID (null for top-level). Used with create or update.'),
      folderType: z
        .enum(['app', 'resource'])
        .optional()
        .describe('Type of folder (only for create)')
    })
  )
  .output(
    z.object({
      folderId: z.string(),
      folderName: z.string().optional(),
      action: z.string(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    if (ctx.input.action === 'create') {
      if (!ctx.input.folderName) {
        throw new Error('folderName is required for the create action');
      }
      let result = await client.createFolder({
        name: ctx.input.folderName,
        parentFolderId: ctx.input.parentFolderId,
        folderType: ctx.input.folderType
      });
      let f = result.data;
      return {
        output: {
          folderId: f.id,
          folderName: f.name,
          action: 'create',
          success: true
        },
        message: `Created folder **${f.name}** with ID \`${f.id}\`.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.folderId) {
        throw new Error('folderId is required for the update action');
      }
      let result = await client.updateFolder(ctx.input.folderId, {
        name: ctx.input.folderName,
        parentFolderId: ctx.input.parentFolderId
      });
      let f = result.data;
      return {
        output: {
          folderId: f.id,
          folderName: f.name,
          action: 'update',
          success: true
        },
        message: `Updated folder **${f.name}** (ID: \`${f.id}\`).`
      };
    }

    // delete
    if (!ctx.input.folderId) {
      throw new Error('folderId is required for the delete action');
    }
    await client.deleteFolder(ctx.input.folderId);
    return {
      output: {
        folderId: ctx.input.folderId,
        action: 'delete',
        success: true
      },
      message: `Deleted folder \`${ctx.input.folderId}\`.`
    };
  })
  .build();
