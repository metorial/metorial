import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageFile = SlateTool.create(spec, {
  name: 'Manage File',
  key: 'manage_file',
  description: `Perform operations on an existing Box file: rename, move to another folder, copy, lock/unlock, update description, or delete. Specify the desired action and relevant parameters.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      fileId: z.string().describe('The unique ID of the file to manage'),
      action: z
        .enum(['rename', 'move', 'copy', 'lock', 'unlock', 'delete', 'update'])
        .describe('The operation to perform on the file'),
      name: z.string().optional().describe('New file name (for rename, copy, or update)'),
      description: z.string().optional().describe('New file description (for update action)'),
      parentFolderId: z
        .string()
        .optional()
        .describe('Target parent folder ID (required for move and copy)'),
      lockExpiresAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the lock should expire (for lock action)')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('The file ID after the operation'),
      name: z.string().optional().describe('File name after the operation'),
      parentFolderId: z.string().optional().describe('Parent folder ID after the operation'),
      deleted: z.boolean().optional().describe('True if the file was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { fileId, action, name, description, parentFolderId, lockExpiresAt } = ctx.input;

    if (action === 'delete') {
      await client.deleteFile(fileId);
      return {
        output: { fileId, deleted: true },
        message: `Deleted file ${fileId}.`
      };
    }

    if (action === 'rename') {
      if (!name) throw new Error('Name is required for rename action');
      let file = await client.updateFile(fileId, { name });
      return {
        output: { fileId: file.id, name: file.name, parentFolderId: file.parent?.id },
        message: `Renamed file to **${file.name}**.`
      };
    }

    if (action === 'move') {
      if (!parentFolderId) throw new Error('parentFolderId is required for move action');
      let updates: Record<string, any> = { parent: { id: parentFolderId } };
      if (name) updates.name = name;
      let file = await client.updateFile(fileId, updates);
      return {
        output: { fileId: file.id, name: file.name, parentFolderId: file.parent?.id },
        message: `Moved file **${file.name}** to folder ${parentFolderId}.`
      };
    }

    if (action === 'copy') {
      if (!parentFolderId) throw new Error('parentFolderId is required for copy action');
      let file = await client.copyFile(fileId, parentFolderId, name);
      return {
        output: { fileId: file.id, name: file.name, parentFolderId: file.parent?.id },
        message: `Copied file to **${file.name}** (${file.id}) in folder ${parentFolderId}.`
      };
    }

    if (action === 'lock') {
      let file = await client.lockFile(fileId, lockExpiresAt);
      return {
        output: { fileId: file.id, name: file.name, parentFolderId: file.parent?.id },
        message: `Locked file **${file.name}**${lockExpiresAt ? ` until ${lockExpiresAt}` : ''}.`
      };
    }

    if (action === 'unlock') {
      let file = await client.unlockFile(fileId);
      return {
        output: { fileId: file.id, name: file.name, parentFolderId: file.parent?.id },
        message: `Unlocked file **${file.name}**.`
      };
    }

    // update action
    let updates: Record<string, any> = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    let file = await client.updateFile(fileId, updates);
    return {
      output: { fileId: file.id, name: file.name, parentFolderId: file.parent?.id },
      message: `Updated file **${file.name}**.`
    };
  });
