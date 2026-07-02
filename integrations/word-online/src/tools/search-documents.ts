import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchDocuments = SlateTool.create(spec, {
  name: 'Search Documents',
  key: 'search_documents',
  description: `Search for Word documents and files across OneDrive or SharePoint by name, content, or metadata.
Uses Microsoft Graph's search to find matching files.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('The search query string. Searches file names, content, and metadata.')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            itemId: z.string().describe('The unique ID of the drive item'),
            name: z.string().describe('File name'),
            mimeType: z.string().optional().describe('MIME type of the file'),
            size: z.number().optional().describe('File size in bytes'),
            webUrl: z.string().optional().describe('URL to open in browser'),
            modifiedAt: z.string().optional().describe('ISO 8601 last modified timestamp'),
            modifiedBy: z.string().optional().describe('Display name of the last modifier'),
            parentPath: z.string().optional().describe('Path of the parent folder'),
            isFolder: z.boolean().describe('Whether this item is a folder')
          })
        )
        .describe('Search results'),
      totalCount: z.number().describe('Number of results found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId
    });

    let results = await client.searchFiles(ctx.input.query);

    return {
      output: {
        results: results.map(item => ({
          itemId: item.itemId,
          name: item.name,
          mimeType: item.mimeType,
          size: item.size,
          webUrl: item.webUrl,
          modifiedAt: item.modifiedAt,
          modifiedBy: item.modifiedBy,
          parentPath: item.parentPath,
          isFolder: item.isFolder
        })),
        totalCount: results.length
      },
      message: `Found **${results.length}** results for "${ctx.input.query}"`
    };
  })
  .build();
