import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageFolder = SlateTool.create(spec, {
  name: 'Manage Folder',
  key: 'manage_folder',
  description: `Create, rename, move, copy, or delete a Box folder. For creating a new folder, provide the parent folder ID and name. For other operations, provide the folder ID and relevant parameters.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'rename', 'move', 'copy', 'delete'])
        .describe('The operation to perform'),
      folderId: z
        .string()
        .optional()
        .describe('The folder ID (required for all actions except create)'),
      parentFolderId: z
        .string()
        .optional()
        .describe('Parent folder ID (required for create, move, and copy; use "0" for root)'),
      name: z
        .string()
        .optional()
        .describe('Folder name (required for create, optional for rename/copy)'),
      recursive: z
        .boolean()
        .optional()
        .describe('Whether to recursively delete folder contents (for delete action)')
    })
  )
  .output(
    z.object({
      folderId: z.string().describe('The folder ID after the operation'),
      name: z.string().optional().describe('Folder name after the operation'),
      parentFolderId: z.string().optional().describe('Parent folder ID after the operation'),
      deleted: z.boolean().optional().describe('True if the folder was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, folderId, parentFolderId, name, recursive } = ctx.input;

    if (action === 'create') {
      if (!parentFolderId) throw new Error('parentFolderId is required for create action');
      if (!name) throw new Error('name is required for create action');
      let folder = await client.createFolder(parentFolderId, name);
      return {
        output: { folderId: folder.id, name: folder.name, parentFolderId: folder.parent?.id },
        message: `Created folder **${folder.name}** (${folder.id}) in folder ${parentFolderId}.`
      };
    }

    if (!folderId) throw new Error('folderId is required for this action');

    if (action === 'delete') {
      await client.deleteFolder(folderId, recursive ?? false);
      return {
        output: { folderId, deleted: true },
        message: `Deleted folder ${folderId}${recursive ? ' (recursively)' : ''}.`
      };
    }

    if (action === 'rename') {
      if (!name) throw new Error('name is required for rename action');
      let folder = await client.updateFolder(folderId, { name });
      return {
        output: { folderId: folder.id, name: folder.name, parentFolderId: folder.parent?.id },
        message: `Renamed folder to **${folder.name}**.`
      };
    }

    if (action === 'move') {
      if (!parentFolderId) throw new Error('parentFolderId is required for move action');
      let updates: Record<string, any> = { parent: { id: parentFolderId } };
      if (name) updates.name = name;
      let folder = await client.updateFolder(folderId, updates);
      return {
        output: { folderId: folder.id, name: folder.name, parentFolderId: folder.parent?.id },
        message: `Moved folder **${folder.name}** to folder ${parentFolderId}.`
      };
    }

    // copy
    if (!parentFolderId) throw new Error('parentFolderId is required for copy action');
    let folder = await client.copyFolder(folderId, parentFolderId, name);
    return {
      output: { folderId: folder.id, name: folder.name, parentFolderId: folder.parent?.id },
      message: `Copied folder to **${folder.name}** (${folder.id}) in folder ${parentFolderId}.`
    };
  });
