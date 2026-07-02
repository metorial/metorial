import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let folderSchema = z.object({
  folderId: z.string().describe('Folder ID'),
  folderName: z.string().optional().describe('Folder name'),
  folderPath: z.string().optional().describe('Full folder path'),
  folderType: z.string().optional().describe('Folder type (system or custom)'),
  messageCount: z.number().optional().describe('Total messages in folder'),
  unreadCount: z.number().optional().describe('Unread messages in folder')
});

export let manageFolders = SlateTool.create(spec, {
  name: 'Manage Folders',
  key: 'manage_folders',
  description: `List, create, rename, delete, empty, or mark-as-read email folders in a Zoho Mail account. Use the \`action\` parameter to specify the operation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      accountId: z.string().describe('Zoho Mail account ID'),
      action: z
        .enum(['list', 'create', 'rename', 'delete', 'empty', 'markAsRead'])
        .describe('Operation to perform'),
      folderId: z
        .string()
        .optional()
        .describe('Folder ID (required for rename, delete, empty, markAsRead)'),
      folderName: z.string().optional().describe('Folder name (required for create, rename)'),
      parentFolderId: z
        .string()
        .optional()
        .describe('Parent folder ID for creating nested folders')
    })
  )
  .output(
    z.object({
      folders: z.array(folderSchema).optional().describe('List of folders (for list action)'),
      folder: folderSchema.optional().describe('Created or updated folder details'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.auth.dataCenterDomain
    });

    let { action, accountId } = ctx.input;

    let mapFolder = (f: any) => ({
      folderId: String(f.folderId),
      folderName: f.folderName,
      folderPath: f.folderPath,
      folderType: f.folderType,
      messageCount: f.messageCount !== undefined ? Number(f.messageCount) : undefined,
      unreadCount: f.unreadCount !== undefined ? Number(f.unreadCount) : undefined
    });

    if (action === 'list') {
      let folders = await client.listFolders(accountId);
      let mapped = folders.map(mapFolder);
      return {
        output: { folders: mapped, success: true },
        message: `Retrieved **${mapped.length}** folder(s).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.folderName) throw new Error('folderName is required for create action');
      let result = await client.createFolder(
        accountId,
        ctx.input.folderName,
        ctx.input.parentFolderId
      );
      return {
        output: { folder: mapFolder(result || {}), success: true },
        message: `Created folder "**${ctx.input.folderName}**".`
      };
    }

    if (action === 'rename') {
      if (!ctx.input.folderId) throw new Error('folderId is required for rename action');
      if (!ctx.input.folderName) throw new Error('folderName is required for rename action');
      let result = await client.renameFolder(
        accountId,
        ctx.input.folderId,
        ctx.input.folderName
      );
      return {
        output: {
          folder: mapFolder(
            result || { folderId: ctx.input.folderId, folderName: ctx.input.folderName }
          ),
          success: true
        },
        message: `Renamed folder to "**${ctx.input.folderName}**".`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.folderId) throw new Error('folderId is required for delete action');
      await client.deleteFolder(accountId, ctx.input.folderId);
      return {
        output: { success: true },
        message: `Deleted folder ${ctx.input.folderId}.`
      };
    }

    if (action === 'empty') {
      if (!ctx.input.folderId) throw new Error('folderId is required for empty action');
      await client.emptyFolder(accountId, ctx.input.folderId);
      return {
        output: { success: true },
        message: `Emptied folder ${ctx.input.folderId}.`
      };
    }

    if (action === 'markAsRead') {
      if (!ctx.input.folderId) throw new Error('folderId is required for markAsRead action');
      await client.markFolderAsRead(accountId, ctx.input.folderId);
      return {
        output: { success: true },
        message: `Marked all emails in folder ${ctx.input.folderId} as read.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
