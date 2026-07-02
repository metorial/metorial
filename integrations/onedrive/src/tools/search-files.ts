import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let searchResultSchema = z.object({
  itemId: z.string().describe('Unique ID of the item'),
  name: z.string().describe('File or folder name'),
  isFolder: z.boolean().describe('Whether this item is a folder'),
  size: z.number().describe('Size in bytes'),
  webUrl: z.string().describe('URL to view in a browser'),
  mimeType: z.string().optional().describe('MIME type (files only)'),
  lastModifiedDateTime: z.string().describe('ISO 8601 last modified timestamp'),
  lastModifiedByName: z.string().optional().describe('Display name of last modifier'),
  parentPath: z.string().optional().describe('Path of the parent folder'),
  driveId: z.string().optional().describe('ID of the drive containing this item')
});

export let searchFilesTool = SlateTool.create(spec, {
  name: 'Search Files',
  key: 'search_files',
  description: `Searches for files and folders in OneDrive or SharePoint by name, content, or metadata. Results include items from the user's own drive as well as items shared with them.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('Search query string. Matches file names, content, and metadata.'),
      driveId: z
        .string()
        .optional()
        .describe("ID of the drive to search. Defaults to the user's personal OneDrive."),
      pageSize: z.number().optional().describe('Maximum number of results to return'),
      pageToken: z.string().optional().describe('Pagination token from a previous response')
    })
  )
  .output(
    z.object({
      results: z.array(searchResultSchema).describe('Search results'),
      nextPageToken: z.string().optional().describe('Token to fetch the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.search({
      driveId: ctx.input.driveId,
      query: ctx.input.query,
      top: ctx.input.pageSize,
      skipToken: ctx.input.pageToken
    });

    let results = result.items.map(item => ({
      itemId: item.id,
      name: item.name,
      isFolder: !!item.folder,
      size: item.size,
      webUrl: item.webUrl,
      mimeType: item.file?.mimeType,
      lastModifiedDateTime: item.lastModifiedDateTime,
      lastModifiedByName: item.lastModifiedBy?.user?.displayName,
      parentPath: item.parentReference?.path,
      driveId: item.parentReference?.driveId
    }));

    let nextPageToken: string | undefined;
    if (result.nextLink) {
      let url = new URL(result.nextLink);
      nextPageToken = url.searchParams.get('$skiptoken') || undefined;
    }

    return {
      output: { results, nextPageToken },
      message: `Found **${results.length}** result(s) for "${ctx.input.query}".${nextPageToken ? ' More results available.' : ''}`
    };
  })
  .build();
