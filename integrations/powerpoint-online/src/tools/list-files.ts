import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { driveItemOutputSchema, mapDriveItem } from '../lib/schemas';
import { spec } from '../spec';

export let listFiles = SlateTool.create(spec, {
  name: 'List Files',
  key: 'list_files',
  description: `List files and folders inside a specific folder in OneDrive or SharePoint. Supports pagination. If no folder is specified, lists items in the drive root.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      folderId: z
        .string()
        .optional()
        .describe('ID of the folder to list. Omit to list the drive root.'),
      folderPath: z
        .string()
        .optional()
        .describe(
          'Path of the folder to list, e.g. "/Documents". Omit to list the drive root.'
        ),
      driveId: z
        .string()
        .optional()
        .describe("ID of the drive. Omit to use the current user's OneDrive."),
      siteId: z
        .string()
        .optional()
        .describe(
          "SharePoint site ID. If provided, operates on the site's default document library."
        ),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of items to return (default: 50).'),
      pageToken: z
        .string()
        .optional()
        .describe('Pagination token from a previous response to fetch the next page.')
    })
  )
  .output(
    z.object({
      files: z.array(driveItemOutputSchema).describe('List of files and folders'),
      nextPageToken: z.string().optional().describe('Token to fetch the next page of results'),
      totalCount: z.number().describe('Number of items returned in this page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient(ctx.auth.token);

    let result = await client.listChildren({
      itemId: ctx.input.folderId,
      itemPath: ctx.input.folderPath,
      driveId: ctx.input.driveId,
      siteId: ctx.input.siteId,
      top: ctx.input.maxResults || 50,
      skipToken: ctx.input.pageToken
    });

    let files = result.items.map(mapDriveItem);

    // Extract skipToken from nextLink if present
    let nextPageToken: string | undefined;
    if (result.nextLink) {
      let url = new URL(result.nextLink);
      nextPageToken = url.searchParams.get('$skiptoken') || result.nextLink;
    }

    return {
      output: {
        files,
        nextPageToken,
        totalCount: files.length
      },
      message: `Found **${files.length}** items${nextPageToken ? ' (more pages available)' : ''}`
    };
  })
  .build();
