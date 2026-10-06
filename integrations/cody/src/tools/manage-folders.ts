import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { folderIdSchema, folderSchema, pageSchema, paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listFolders = SlateTool.create(spec, {
  name: 'List Folders',
  key: 'list_folders',
  description: `Retrieve all folders used to organize your knowledge base documents. Optionally filter by name keyword.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z.string().optional().describe('Filter folders by partial name match'),
      page: pageSchema
    })
  )
  .output(
    z.object({
      folders: z.array(folderSchema),
      pagination: paginationSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listFolders({
      keyword: ctx.input.keyword,
      page: ctx.input.page
    });

    return {
      output: result,
      message: `Found **${result.folders.length}** folder(s)${result.pagination.total > result.folders.length ? ` (${result.pagination.total} total)` : ''}.`
    };
  });

export let createFolder = SlateTool.create(spec, {
  name: 'Create Folder',
  key: 'create_folder',
  description: `Create a new folder to organize knowledge base documents.`
})
  .input(
    z.object({
      name: z.string().min(1).describe('Name for the new folder')
    })
  )
  .output(folderSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let folder = await client.createFolder(ctx.input.name);

    return {
      output: folder,
      message: `Created folder **${folder.name}** (${folder.folderId}).`
    };
  });

export let updateFolder = SlateTool.create(spec, {
  name: 'Update Folder',
  key: 'update_folder',
  description: `Rename an existing knowledge base folder. Call list_folders to discover folder IDs.`
})
  .input(
    z.object({
      folderId: folderIdSchema,
      name: z.string().min(1).describe('New name for the folder')
    })
  )
  .output(folderSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let folder = await client.updateFolder(ctx.input.folderId, ctx.input.name);

    return {
      output: folder,
      message: `Updated folder to **${folder.name}** (${folder.folderId}).`
    };
  });

export let getFolder = SlateTool.create(spec, {
  name: 'Get Folder',
  key: 'get_folder',
  description: `Retrieve a knowledge base folder by its ID. Call list_folders to discover available folders.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      folderId: folderIdSchema
    })
  )
  .output(folderSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let folder = await client.getFolder(ctx.input.folderId);

    return {
      output: folder,
      message: `Retrieved folder **${folder.name}** (${folder.folderId}).`
    };
  });
