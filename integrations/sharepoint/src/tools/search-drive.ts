import { SlateTool } from 'slates';
import { z } from 'zod';
import { SharePointClient } from '../lib/client';
import { spec } from '../spec';

let searchResultSchema = z.object({
  itemId: z.string().describe('Drive item ID'),
  fileName: z.string().describe('File or folder name'),
  webUrl: z.string().optional().describe('URL to access the item'),
  size: z.number().optional().describe('File size in bytes'),
  isFolder: z.boolean().describe('Whether this is a folder'),
  lastModifiedDateTime: z.string().optional().describe('Last modified date'),
  lastModifiedBy: z.string().optional().describe('User who last modified the item'),
  parentPath: z.string().optional().describe('Path of the parent folder')
});

export let searchDrive = SlateTool.create(spec, {
  name: 'Search Drive',
  key: 'search_drive',
  description: `Search for files and folders within a specific SharePoint document library (drive). Uses the OneDrive search API scoped to a single drive. Returns matching items with their metadata.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      driveId: z.string().describe('Drive (document library) ID to search within'),
      query: z.string().describe('Search query text')
    })
  )
  .output(
    z.object({
      results: z.array(searchResultSchema).describe('Matching files and folders'),
      totalCount: z.number().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SharePointClient(ctx.auth.token);
    let data = await client.searchDriveItems(ctx.input.driveId, ctx.input.query);

    let results = (data.value || []).map((item: any) => ({
      itemId: item.id,
      fileName: item.name,
      webUrl: item.webUrl,
      size: item.size,
      isFolder: !!item.folder,
      lastModifiedDateTime: item.lastModifiedDateTime,
      lastModifiedBy: item.lastModifiedBy?.user?.displayName,
      parentPath: item.parentReference?.path
    }));

    return {
      output: {
        results,
        totalCount: results.length
      },
      message: `Found **${results.length}** result(s) for "${ctx.input.query}" in the drive.`
    };
  })
  .build();
