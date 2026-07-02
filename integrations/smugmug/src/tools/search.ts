import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchTool = SlateTool.create(spec, {
  name: 'Search',
  key: 'search',
  description: `Search across SmugMug content including albums, images, and nodes. Perform text-based searches scoped to a user, album, node, or folder. Returns matching results with pagination support.`,
  instructions: [
    'Set "resourceType" to choose what to search: albums, images, or nodes.',
    'Use "scope" to limit the search to a specific user, album, or folder URI (e.g., "/api/v2/user/username").'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['albums', 'images', 'nodes'])
        .describe('Type of resource to search'),
      query: z.string().describe('Search text'),
      scope: z
        .string()
        .optional()
        .describe(
          'Scope URI to limit the search (e.g., "/api/v2/user/username", "/api/v2/album/KEY")'
        ),
      start: z.number().optional().describe('Starting index (1-based) for pagination'),
      count: z.number().optional().describe('Number of results to return')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            resourceType: z.string().describe('Type of resource'),
            key: z.string().describe('Resource key or ID'),
            name: z.string().optional().describe('Resource name/title'),
            description: z.string().optional().describe('Resource description/caption'),
            webUri: z.string().optional().describe('Web URL'),
            uri: z.string().optional().describe('API URI')
          })
        )
        .describe('Search results'),
      totalResults: z.number().describe('Total number of matching results'),
      start: z.number().describe('Current start index'),
      count: z.number().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      tokenSecret: ctx.auth.tokenSecret,
      consumerKey: ctx.auth.consumerKey,
      consumerSecret: ctx.auth.consumerSecret
    });

    let pagination = { start: ctx.input.start, count: ctx.input.count };
    let results: any[] = [];
    let totalResults = 0;

    if (ctx.input.resourceType === 'albums') {
      let data = await client.searchAlbums(ctx.input.query, ctx.input.scope, pagination);
      results = data.items.map((album: any) => ({
        resourceType: 'album',
        key: album.AlbumKey || '',
        name: album.Name || undefined,
        description: album.Description || undefined,
        webUri: album.WebUri || undefined,
        uri: album.Uri || undefined
      }));
      totalResults = data.pages.total;
    } else if (ctx.input.resourceType === 'images') {
      let data = await client.searchImages(ctx.input.query, ctx.input.scope, pagination);
      results = data.items.map((image: any) => ({
        resourceType: 'image',
        key: image.ImageKey || '',
        name: image.Title || image.FileName || undefined,
        description: image.Caption || undefined,
        webUri: image.WebUri || undefined,
        uri: image.Uri || undefined
      }));
      totalResults = data.pages.total;
    } else {
      let data = await client.searchNodes(ctx.input.query, ctx.input.scope, pagination);
      results = data.items.map((node: any) => ({
        resourceType: node.Type?.toLowerCase() || 'node',
        key: node.NodeID || '',
        name: node.Name || undefined,
        description: node.Description || undefined,
        webUri: node.WebUri || undefined,
        uri: node.Uri || undefined
      }));
      totalResults = data.pages.total;
    }

    return {
      output: {
        results,
        totalResults,
        start: ctx.input.start || 1,
        count: results.length
      },
      message: `Found **${totalResults}** ${ctx.input.resourceType} matching "${ctx.input.query}" (showing ${results.length})`
    };
  })
  .build();
