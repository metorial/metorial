import { SlateTool } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { spec } from '../spec';

export let listDocumentFolders = SlateTool.create(spec, {
  name: 'List Document Folders',
  key: 'list_document_folders',
  description: `List document folders in the PandaDoc workspace.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      parentUuid: z.string().optional().describe('Parent folder UUID to list children of'),
      page: z.number().optional().describe('Page number'),
      count: z.number().optional().describe('Items per page')
    })
  )
  .output(
    z.object({
      folders: z
        .array(
          z.object({
            folderId: z.string().describe('Folder UUID'),
            folderName: z.string().describe('Folder name'),
            dateCreated: z.string().optional().describe('ISO 8601 creation date')
          })
        )
        .describe('List of document folders')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let params: any = {};
    if (ctx.input.parentUuid) params.parent_uuid = ctx.input.parentUuid;
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.count) params.count = ctx.input.count;

    let result = await client.listDocumentFolders(params);

    let folders = (result.results || result || []).map((f: any) => ({
      folderId: f.uuid || f.id,
      folderName: f.name,
      dateCreated: f.date_created
    }));

    return {
      output: { folders },
      message: `Found **${folders.length}** document folder(s).`
    };
  })
  .build();

export let createDocumentFolder = SlateTool.create(spec, {
  name: 'Create Document Folder',
  key: 'create_document_folder',
  description: `Create a new folder for organizing PandaDoc documents.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      folderName: z.string().describe('Name of the new folder'),
      parentUuid: z.string().optional().describe('Parent folder UUID (for nested folders)')
    })
  )
  .output(
    z.object({
      folderId: z.string().describe('UUID of the created folder'),
      folderName: z.string().describe('Name of the created folder')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.createDocumentFolder({
      name: ctx.input.folderName,
      parent_uuid: ctx.input.parentUuid
    });

    return {
      output: {
        folderId: result.uuid || result.id,
        folderName: result.name
      },
      message: `Created folder **${result.name}** (ID: \`${result.uuid || result.id}\`).`
    };
  })
  .build();

export let renameDocumentFolder = SlateTool.create(spec, {
  name: 'Rename Document Folder',
  key: 'rename_document_folder',
  description: `Rename an existing PandaDoc document folder.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      folderId: z.string().describe('UUID of the document folder to rename'),
      folderName: z.string().describe('New folder name')
    })
  )
  .output(
    z.object({
      folderId: z.string().describe('UUID of the renamed folder'),
      folderName: z.string().describe('Updated folder name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.renameDocumentFolder(ctx.input.folderId, {
      name: ctx.input.folderName
    });

    return {
      output: {
        folderId: result.uuid || result.id || ctx.input.folderId,
        folderName: result.name || ctx.input.folderName
      },
      message: `Renamed folder \`${ctx.input.folderId}\` to **${result.name || ctx.input.folderName}**.`
    };
  })
  .build();
