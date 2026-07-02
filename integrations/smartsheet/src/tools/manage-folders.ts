import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmartsheetClient } from '../lib/client';
import { spec } from '../spec';

let folderOutputSchema = z.object({
  folderId: z.number().describe('Folder ID'),
  name: z.string().describe('Folder name'),
  permalink: z.string().optional().describe('URL to the folder')
});

export let manageFolders = SlateTool.create(spec, {
  name: 'Manage Folders',
  key: 'manage_folders',
  description: `Create, list, update, or delete folders. Folders can be created at the home level, inside a workspace, or as subfolders within other folders. Use the **action** field to specify the operation.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      folderId: z
        .string()
        .optional()
        .describe('Folder ID (required for get, update, delete, and creating subfolders)'),
      workspaceId: z
        .string()
        .optional()
        .describe(
          'Workspace ID (for listing workspace folders or creating folder in workspace)'
        ),
      name: z.string().optional().describe('Folder name (required for create and update)')
    })
  )
  .output(
    z.object({
      folder: folderOutputSchema
        .optional()
        .describe('Folder details (for get, create, update)'),
      folders: z.array(folderOutputSchema).optional().describe('List of folders (for list)'),
      success: z.boolean().optional().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result: any;
      if (ctx.input.workspaceId) {
        result = await client.listWorkspaceFolders(ctx.input.workspaceId, {
          includeAll: true
        });
      } else {
        result = await client.listFolders({ includeAll: true });
      }
      let folders = (result.data || []).map((f: any) => ({
        folderId: f.id,
        name: f.name,
        permalink: f.permalink
      }));
      return {
        output: { folders },
        message: `Found **${folders.length}** folder(s).`
      };
    }

    if (ctx.input.action === 'get') {
      let folder = await client.getFolder(ctx.input.folderId!);
      return {
        output: {
          folder: {
            folderId: folder.id,
            name: folder.name,
            permalink: folder.permalink
          }
        },
        message: `Retrieved folder **${folder.name}**.`
      };
    }

    if (ctx.input.action === 'create') {
      let result: any;
      if (ctx.input.workspaceId) {
        result = await client.createFolderInWorkspace(ctx.input.workspaceId, {
          name: ctx.input.name!
        });
      } else if (ctx.input.folderId) {
        result = await client.createSubfolder(ctx.input.folderId, { name: ctx.input.name! });
      } else {
        result = await client.createFolder({ name: ctx.input.name! });
      }
      let folder = result.result || result;
      return {
        output: {
          folder: {
            folderId: folder.id,
            name: folder.name,
            permalink: folder.permalink
          }
        },
        message: `Created folder **${folder.name}** (ID: ${folder.id}).`
      };
    }

    if (ctx.input.action === 'update') {
      let result = await client.updateFolder(ctx.input.folderId!, { name: ctx.input.name! });
      let folder = result.result || result;
      return {
        output: {
          folder: {
            folderId: folder.id || Number(ctx.input.folderId),
            name: folder.name || ctx.input.name!,
            permalink: folder.permalink
          }
        },
        message: `Updated folder to **${ctx.input.name}**.`
      };
    }

    // delete
    await client.deleteFolder(ctx.input.folderId!);
    return {
      output: { success: true },
      message: `Deleted folder **${ctx.input.folderId}**.`
    };
  })
  .build();
