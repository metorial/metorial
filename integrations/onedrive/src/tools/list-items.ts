import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let itemSchema = z.object({
  itemId: z.string().describe('Unique ID of the item'),
  name: z.string().describe('File or folder name'),
  isFolder: z.boolean().describe('Whether this item is a folder'),
  size: z.number().describe('Size in bytes'),
  webUrl: z.string().describe('URL to view in a browser'),
  mimeType: z.string().optional().describe('MIME type (files only)'),
  childCount: z.number().optional().describe('Number of children (folders only)'),
  createdDateTime: z.string().describe('ISO 8601 creation timestamp'),
  lastModifiedDateTime: z.string().describe('ISO 8601 last modified timestamp'),
  createdByName: z.string().optional().describe('Display name of the creator'),
  lastModifiedByName: z.string().optional().describe('Display name of last modifier'),
  parentPath: z.string().optional().describe('Path of the parent folder')
});

export let listItemsTool = SlateTool.create(spec, {
  name: 'List Files & Folders',
  key: 'list_items',
  description: `Lists files and folders within a specific folder in OneDrive or a SharePoint document library. Supports pagination, filtering, and sorting. Items can be addressed by folder ID or by path.`,
  instructions: [
    'Provide either itemId or itemPath to specify the folder. Omit both to list the drive root.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      driveId: z
        .string()
        .optional()
        .describe("ID of the drive. Defaults to the user's personal OneDrive."),
      itemId: z.string().optional().describe('ID of the folder to list contents of'),
      itemPath: z
        .string()
        .optional()
        .describe('Path to the folder (e.g. "/Documents/Reports")'),
      pageSize: z.number().optional().describe('Number of items to return per page (max 200)'),
      pageToken: z
        .string()
        .optional()
        .describe('Pagination token from a previous response to get the next page'),
      orderBy: z
        .string()
        .optional()
        .describe('Sort order (e.g. "name asc", "lastModifiedDateTime desc")'),
      filter: z.string().optional().describe('OData filter expression')
    })
  )
  .output(
    z.object({
      items: z.array(itemSchema).describe('List of files and folders'),
      nextPageToken: z.string().optional().describe('Token to fetch the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listChildren({
      driveId: ctx.input.driveId,
      itemId: ctx.input.itemId,
      itemPath: ctx.input.itemPath,
      top: ctx.input.pageSize,
      skipToken: ctx.input.pageToken,
      orderBy: ctx.input.orderBy,
      filter: ctx.input.filter
    });

    let items = result.items.map(item => ({
      itemId: item.id,
      name: item.name,
      isFolder: !!item.folder,
      size: item.size,
      webUrl: item.webUrl,
      mimeType: item.file?.mimeType,
      childCount: item.folder?.childCount,
      createdDateTime: item.createdDateTime,
      lastModifiedDateTime: item.lastModifiedDateTime,
      createdByName: item.createdBy?.user?.displayName,
      lastModifiedByName: item.lastModifiedBy?.user?.displayName,
      parentPath: item.parentReference?.path
    }));

    let nextPageToken: string | undefined;
    if (result.nextLink) {
      let url = new URL(result.nextLink);
      nextPageToken = url.searchParams.get('$skiptoken') || undefined;
    }

    return {
      output: { items, nextPageToken },
      message: `Listed **${items.length}** item(s).${nextPageToken ? ' More results available.' : ''}`
    };
  })
  .build();
