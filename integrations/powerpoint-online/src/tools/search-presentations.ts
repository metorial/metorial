import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { driveItemOutputSchema, mapDriveItem } from '../lib/schemas';
import { spec } from '../spec';

export let searchPresentations = SlateTool.create(spec, {
  name: 'Search Files',
  key: 'search_files',
  description: `Search for files including PowerPoint presentations across OneDrive or SharePoint by keyword. Returns matching files with metadata. Searches file names and content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query to find files by name or content keywords.'),
      driveId: z.string().optional().describe('ID of a specific drive to search within.'),
      siteId: z.string().optional().describe('SharePoint site ID to search within.'),
      maxResults: z.number().optional().describe('Maximum number of results to return.')
    })
  )
  .output(
    z.object({
      results: z.array(driveItemOutputSchema).describe('Matching files'),
      totalCount: z.number().describe('Number of results returned'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient(ctx.auth.token);

    let result = await client.searchFiles({
      query: ctx.input.query,
      driveId: ctx.input.driveId,
      siteId: ctx.input.siteId,
      top: ctx.input.maxResults
    });

    let results = result.items.map(mapDriveItem);

    return {
      output: {
        results,
        totalCount: results.length,
        hasMore: !!result.nextLink
      },
      message: `Found **${results.length}** result(s) for "${ctx.input.query}"`
    };
  })
  .build();
