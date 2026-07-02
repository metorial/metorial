import { SlateTool } from 'slates';
import { z } from 'zod';
import { SharePointClient } from '../lib/client';
import { spec } from '../spec';

let sharepointIdsSchema = z.object({
  siteId: z.string().optional().describe('SharePoint site ID'),
  siteUrl: z.string().optional().describe('SharePoint site URL'),
  webId: z.string().optional().describe('SharePoint web ID'),
  listId: z.string().optional().describe('SharePoint list ID'),
  listItemId: z.string().optional().describe('SharePoint list item ID'),
  listItemUniqueId: z.string().optional().describe('SharePoint list item unique ID'),
  driveId: z.string().optional().describe('Drive ID'),
  driveItemId: z.string().optional().describe('Drive item ID'),
  tenantId: z.string().optional().describe('Tenant ID')
});

let searchResultSchema = z.object({
  resourceId: z.string().optional().describe('ID of the matched resource'),
  hitId: z.string().optional().describe('Hit ID returned by Microsoft Search'),
  resourceName: z.string().optional().describe('Name or title of the matched resource'),
  resourceType: z
    .string()
    .optional()
    .describe('Type of the matched resource (e.g. driveItem, site, listItem)'),
  webUrl: z.string().optional().describe('URL of the resource'),
  sharepointIds: sharepointIdsSchema
    .optional()
    .describe('Graph sharepointIds for the resource'),
  summary: z.string().optional().describe('Search result summary/snippet'),
  lastModifiedDateTime: z.string().optional().describe('Last modified date'),
  lastModifiedBy: z.string().optional().describe('User who last modified the resource')
});

export let search = SlateTool.create(spec, {
  name: 'Search',
  key: 'search',
  description: `Search across SharePoint content using the Microsoft Search API. Search for files, folders, lists, list items, or sites using KQL (Keyword Query Language) queries. Supports filtering by entity type and pagination.`,
  instructions: [
    'Use **query** with KQL syntax for powerful searches, e.g. "budget filetype:xlsx" or "author:john".',
    'Use **entityTypes** to narrow results to specific types: "driveItem" (files/folders), "listItem", "list", "site".',
    'Use **from** and **size** for pagination.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query string (supports KQL syntax)'),
      entityTypes: z
        .array(z.enum(['driveItem', 'listItem', 'list', 'site']))
        .optional()
        .describe('Types of entities to search for. Defaults to all types.'),
      from: z.number().optional().describe('Offset for pagination (default 0)'),
      size: z.number().optional().describe('Number of results to return (default 25, max 500)')
    })
  )
  .output(
    z.object({
      results: z.array(searchResultSchema).describe('Search results'),
      totalCount: z.number().describe('Total number of matching results (may be approximate)'),
      moreResultsAvailable: z.boolean().describe('Whether there are more results to fetch')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SharePointClient(ctx.auth.token);
    let entityTypes = ctx.input.entityTypes?.length
      ? ctx.input.entityTypes
      : ['driveItem', 'listItem', 'list', 'site'];

    let data = await client.search(
      ctx.input.query,
      entityTypes,
      ctx.input.from,
      ctx.input.size
    );

    let results: any[] = [];
    let totalCount = 0;
    let moreResultsAvailable = false;

    let hitsContainers = data.value?.[0]?.hitsContainers || [];
    for (let container of hitsContainers) {
      totalCount += container.total || 0;
      moreResultsAvailable = moreResultsAvailable || container.moreResultsAvailable || false;

      for (let hit of container.hits || []) {
        let resource = hit.resource || {};
        let sharepointIds =
          resource.sharepointIds && typeof resource.sharepointIds === 'object'
            ? {
                siteId: resource.sharepointIds.siteId,
                siteUrl: resource.sharepointIds.siteUrl,
                webId: resource.sharepointIds.webId,
                listId: resource.sharepointIds.listId,
                listItemId: resource.sharepointIds.listItemId,
                listItemUniqueId: resource.sharepointIds.listItemUniqueId,
                driveId: resource.sharepointIds.driveId,
                driveItemId: resource.sharepointIds.driveItemId,
                tenantId: resource.sharepointIds.tenantId
              }
            : undefined;
        results.push({
          resourceId:
            resource.id ||
            sharepointIds?.driveItemId ||
            sharepointIds?.listItemId ||
            sharepointIds?.listId ||
            sharepointIds?.siteId ||
            hit.hitId,
          hitId: hit.hitId,
          resourceName: resource.name || resource.displayName,
          resourceType: hit.resource?.['@odata.type']?.replace('#microsoft.graph.', ''),
          webUrl: resource.webUrl,
          sharepointIds,
          summary: hit.summary,
          lastModifiedDateTime: resource.lastModifiedDateTime,
          lastModifiedBy: resource.lastModifiedBy?.user?.displayName
        });
      }
    }

    return {
      output: {
        results,
        totalCount,
        moreResultsAvailable
      },
      message: `Found **${totalCount}** result(s) for "${ctx.input.query}". Returned ${results.length} in this page.`
    };
  })
  .build();
