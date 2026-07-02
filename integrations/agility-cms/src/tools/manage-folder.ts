import { SlateTool } from 'slates';
import { z } from 'zod';
import { MgmtClient } from '../lib/client';
import { spec } from '../spec';

export let manageFolder = SlateTool.create(spec, {
  name: 'Manage Folder',
  key: 'manage_folder',
  description: `Creates, deletes, or renames a folder in the Agility CMS asset library. Requires OAuth authentication.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      operation: z
        .enum(['create', 'delete', 'rename'])
        .describe('Operation: "create", "delete", or "rename"'),
      folderName: z.string().optional().describe('Folder name for create operations'),
      parentFolder: z.string().optional().describe('Parent folder path for create operations'),
      folderPath: z.string().optional().describe('Folder path for delete/rename operations'),
      newName: z.string().optional().describe('New folder name for rename operations')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MgmtClient({
      token: ctx.auth.token,
      guid: ctx.config.guid,
      locale: ctx.config.locale,
      region: ctx.auth.region
    });

    switch (ctx.input.operation) {
      case 'create': {
        if (!ctx.input.folderName) throw new Error('folderName is required for create');
        await client.createFolder(ctx.input.folderName, ctx.input.parentFolder);
        return {
          output: { success: true },
          message: `Created folder **${ctx.input.folderName}**${ctx.input.parentFolder ? ` in ${ctx.input.parentFolder}` : ''}`
        };
      }
      case 'delete': {
        if (!ctx.input.folderPath) throw new Error('folderPath is required for delete');
        await client.deleteFolder(ctx.input.folderPath);
        return {
          output: { success: true },
          message: `Deleted folder **${ctx.input.folderPath}**`
        };
      }
      case 'rename': {
        if (!ctx.input.folderPath) throw new Error('folderPath is required for rename');
        if (!ctx.input.newName) throw new Error('newName is required for rename');
        await client.renameFolder(ctx.input.folderPath, ctx.input.newName);
        return {
          output: { success: true },
          message: `Renamed folder **${ctx.input.folderPath}** to **${ctx.input.newName}**`
        };
      }
    }
  })
  .build();
