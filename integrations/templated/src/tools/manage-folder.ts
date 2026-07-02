import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageFolder = SlateTool.create(spec, {
  name: 'Manage Folder',
  key: 'manage_folder',
  description: `Create, update, or delete folders for organizing templates and renders. Also supports moving templates and renders into folders.
Specify the **action** to perform: create, update, delete, moveTemplate, or moveRender.`,
  instructions: [
    'To create a folder, set action to "create" and provide a folderName.',
    'To move a template, set action to "moveTemplate" and provide both folderId and templateId.',
    'To move a render, set action to "moveRender" and provide both folderId and renderId.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'moveTemplate', 'moveRender'])
        .describe('Action to perform'),
      folderId: z
        .string()
        .optional()
        .describe('Folder ID (required for update, delete, moveTemplate, moveRender)'),
      folderName: z.string().optional().describe('Folder name (required for create, update)'),
      templateId: z
        .string()
        .optional()
        .describe('Template ID to move (required for moveTemplate)'),
      renderId: z.string().optional().describe('Render ID to move (required for moveRender)')
    })
  )
  .output(
    z.object({
      folderId: z.string().optional(),
      folderName: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      deleted: z.boolean().optional(),
      moved: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, folderId, folderName, templateId, renderId } = ctx.input;

    switch (action) {
      case 'create': {
        if (!folderName) throw new Error('folderName is required for create action');
        let result = await client.createFolder(folderName);
        return {
          output: {
            folderId: result.id,
            folderName: result.name,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt
          },
          message: `Created folder **${result.name}** with ID \`${result.id}\`.`
        };
      }
      case 'update': {
        if (!folderId) throw new Error('folderId is required for update action');
        if (!folderName) throw new Error('folderName is required for update action');
        let result = await client.updateFolder(folderId, folderName);
        return {
          output: {
            folderId: result.id,
            folderName: result.name,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt
          },
          message: `Updated folder to **${result.name}**.`
        };
      }
      case 'delete': {
        if (!folderId) throw new Error('folderId is required for delete action');
        await client.deleteFolder(folderId);
        return {
          output: { deleted: true },
          message: `Deleted folder **${folderId}**. Templates within the folder have been preserved.`
        };
      }
      case 'moveTemplate': {
        if (!folderId) throw new Error('folderId is required for moveTemplate action');
        if (!templateId) throw new Error('templateId is required for moveTemplate action');
        await client.moveTemplateToFolder(folderId, templateId);
        return {
          output: { moved: true, folderId },
          message: `Moved template \`${templateId}\` to folder \`${folderId}\`.`
        };
      }
      case 'moveRender': {
        if (!folderId) throw new Error('folderId is required for moveRender action');
        if (!renderId) throw new Error('renderId is required for moveRender action');
        await client.moveRenderToFolder(folderId, renderId);
        return {
          output: { moved: true, folderId },
          message: `Moved render \`${renderId}\` to folder \`${folderId}\`.`
        };
      }
    }
  })
  .build();
