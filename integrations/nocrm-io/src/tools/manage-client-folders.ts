import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageClientFolders = SlateTool.create(spec, {
  name: 'Manage Client Folders',
  key: 'manage_client_folders',
  description: `List, create, retrieve, update, or delete client folders (company-level records). Client folders can be associated with leads to group them by company. Use the "action" field to specify the operation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      clientFolderId: z
        .number()
        .optional()
        .describe('Client folder ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Folder name (required for create, optional for update)'),
      description: z.string().optional().describe('Folder description'),
      userId: z.number().optional().describe('Assigned user ID (for create)'),
      isActive: z.boolean().optional().describe('Active status (for update)')
    })
  )
  .output(
    z.object({
      clientFolders: z
        .array(
          z.object({
            clientFolderId: z.number().describe('Client folder ID'),
            name: z.string().describe('Folder name'),
            description: z.string().optional().describe('Folder description'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of client folders (for "list" action)'),
      clientFolder: z
        .object({
          clientFolderId: z.number().describe('Client folder ID'),
          name: z.string().describe('Folder name'),
          description: z.string().optional().describe('Folder description'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          updatedAt: z.string().optional().describe('Last update timestamp')
        })
        .optional()
        .describe('Single client folder (for get/create/update)'),
      deleted: z.boolean().optional().describe('Whether the folder was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let mapFolder = (f: any) => ({
      clientFolderId: f.id,
      name: f.name,
      description: f.description,
      createdAt: f.created_at,
      updatedAt: f.updated_at
    });

    if (ctx.input.action === 'list') {
      let folders = await client.listClientFolders();
      return {
        output: { clientFolders: folders.map(mapFolder) },
        message: `Found **${folders.length}** client folders.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.clientFolderId)
        throw new Error('clientFolderId is required for get action');
      let folder = await client.getClientFolder(ctx.input.clientFolderId);
      return {
        output: { clientFolder: mapFolder(folder) },
        message: `Retrieved client folder **"${folder.name}"** (ID: ${folder.id}).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create action');
      let folder = await client.createClientFolder({
        name: ctx.input.name,
        description: ctx.input.description,
        userId: ctx.input.userId
      });
      return {
        output: { clientFolder: mapFolder(folder) },
        message: `Created client folder **"${folder.name}"** (ID: ${folder.id}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.clientFolderId)
        throw new Error('clientFolderId is required for update action');
      let folder = await client.updateClientFolder(ctx.input.clientFolderId, {
        name: ctx.input.name,
        description: ctx.input.description,
        isActive: ctx.input.isActive
      });
      return {
        output: { clientFolder: mapFolder(folder) },
        message: `Updated client folder **"${folder.name}"** (ID: ${folder.id}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.clientFolderId)
        throw new Error('clientFolderId is required for delete action');
      await client.deleteClientFolder(ctx.input.clientFolderId);
      return {
        output: { deleted: true },
        message: `Deleted client folder ${ctx.input.clientFolderId}.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
