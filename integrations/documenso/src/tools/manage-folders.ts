import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { folderMap, pageMap } from '../lib/schemas';
import { clientConfig, invalid } from '../lib/validation';
import { spec } from '../spec';

let folderSchema = z.object({
  folderId: z.string().describe('Unique identifier of the folder'),
  name: z.string().describe('Folder name'),
  parentFolderId: z.string().optional().describe('ID of the parent folder'),
  teamId: z.number().optional(),
  ownerId: z.number().optional(),
  type: z.string().optional()
});

export let manageFoldersTool = SlateTool.create(spec, {
  name: 'Manage Folders',
  key: 'manage_folders',
  description: `List, create, update, or delete folders for organizing documents and templates. Provide exactly one action per call: set **action** to "list", "create", "update", or "delete".`,
  tags: { destructive: true },
  instructions: [
    'action=list: optionally pass query, page, perPage, parentFolderId to filter.',
    'action=create: name is required, parentFolderId is optional.',
    'action=update: folderId and name are required.',
    'action=delete: folderId is required. Deletion removes the folder and its child folders; documents become unfiled and are not deleted. Inspect contained resources first.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete'])
        .describe('The folder operation to perform'),
      folderId: z.string().optional().describe('Folder ID (required for update and delete)'),
      name: z
        .string()
        .optional()
        .describe('Folder name (required for create, optional for update)'),
      parentFolderId: z
        .string()
        .optional()
        .describe('Parent folder ID (for create and list filtering)'),
      query: z.string().optional().describe('Search query for listing folders'),
      page: z.number().optional().describe('Page number for listing'),
      perPage: z.number().optional().describe('Results per page for listing')
    })
  )
  .output(
    z.object({
      folders: z.array(folderSchema).optional().describe('List of folders (for list action)'),
      folder: folderSchema.optional().describe('Created or updated folder'),
      deleted: z.boolean().optional().describe('Whether the folder was deleted'),
      totalCount: z.number().optional(),
      currentPage: z.number().optional(),
      perPage: z.number().optional(),
      totalPages: z.number().optional(),
      nextPage: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    const input = ctx.input,
      client = new Client(clientConfig(ctx));
    if (input.action === 'list') {
      if (input.folderId !== undefined || input.name !== undefined)
        throw invalid('Listing accepts query, page, perPage, and parentFolderId only.');
      const r = await client.findFolders(input);
      return {
        output: { folders: r.data.map(folderMap), ...pageMap(r) },
        message: `Found ${r.data.length} folder(s) on this page.`
      };
    }
    if (input.query !== undefined || input.page !== undefined || input.perPage !== undefined)
      throw invalid('Paging/search parameters apply only to list.');
    if (input.action === 'create') {
      if (input.folderId !== undefined || input.name === undefined)
        throw invalid(
          'Creation requires name and optionally parentFolderId, without folderId.'
        );
      const r = await client.createFolder({
        name: input.name,
        parentFolderId: input.parentFolderId
      });
      return { output: { folder: folderMap(r) }, message: 'Created folder.' };
    }
    if (input.folderId === undefined || input.parentFolderId !== undefined)
      throw invalid(
        'Use folderId for update/delete; moving folders is not supported by this tool.'
      );
    if (input.action === 'update') {
      const r = await client.updateFolder(input.folderId, { name: input.name });
      return { output: { folder: folderMap(r) }, message: 'Updated folder.' };
    }
    if (input.name !== undefined) throw invalid('Delete accepts folderId only.');
    await client.deleteFolder(input.folderId);
    return {
      output: { deleted: true },
      message:
        'Documenso acknowledged folder deletion. Existing documents and retained history are not erased.'
    };
  })
  .build();
