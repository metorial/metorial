import { SlateTool } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { spec } from '../spec';

export let listDocumentFolders = SlateTool.create(spec, {
  name: 'List Document Folders',
  key: 'list_document_folders',
  description: `List document folders in the PandaDoc workspace. Optionally create a new folder or move a document into a folder.`,
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

export let moveDocumentToFolder = SlateTool.create(spec, {
  name: 'Move Document to Folder',
  key: 'move_document_to_folder',
  description: `Move a PandaDoc document into a specific folder.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('UUID of the document to move'),
      folderId: z.string().describe('UUID of the destination folder')
    })
  )
  .output(
    z.object({
      moved: z.boolean().describe('Whether the document was successfully moved'),
      documentId: z.string().describe('Document UUID'),
      folderId: z.string().describe('Destination folder UUID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.moveDocumentToFolder(ctx.input.documentId, ctx.input.folderId);

    return {
      output: {
        moved: true,
        documentId: ctx.input.documentId,
        folderId: ctx.input.folderId
      },
      message: `Moved document \`${ctx.input.documentId}\` to folder \`${ctx.input.folderId}\`.`
    };
  })
  .build();
