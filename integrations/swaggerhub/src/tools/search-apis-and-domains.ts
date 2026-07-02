import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let apiEntrySchema = z.object({
  name: z.string().optional().describe('Name of the API or domain'),
  owner: z.string().optional().describe('Owner of the API or domain'),
  description: z.string().optional().describe('Description'),
  url: z.string().optional().describe('URL to the resource on SwaggerHub'),
  properties: z
    .array(
      z.object({
        type: z.string().optional(),
        url: z.string().optional()
      })
    )
    .optional()
    .describe('Associated properties and links')
});

export let searchApisAndDomains = SlateTool.create(spec, {
  name: 'Search APIs & Domains',
  key: 'search_apis_and_domains',
  description: `Search the SwaggerHub catalog for APIs and domains. Supports filtering by type (API or domain), visibility, published state, owner, and free text query. Returns paginated results with metadata including name, owner, description, and links.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Free text search query'),
      specType: z.enum(['API', 'DOMAIN', 'ANY']).optional().describe('Filter by spec type'),
      visibility: z
        .enum(['PUBLIC', 'PRIVATE', 'ANY'])
        .optional()
        .describe('Filter by visibility'),
      state: z
        .enum(['ALL', 'PUBLISHED', 'UNPUBLISHED'])
        .optional()
        .describe('Filter by published state'),
      owner: z.string().optional().describe('Filter by owner (username or organization)'),
      page: z.number().optional().describe('Page number (0-based)'),
      limit: z.number().optional().describe('Results per page (1-100, default 10)'),
      sort: z
        .enum(['NAME', 'UPDATED', 'CREATED', 'OWNER', 'BEST_MATCH', 'TITLE'])
        .optional()
        .describe('Sort field'),
      order: z.enum(['ASC', 'DESC']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      totalCount: z.number().optional().describe('Total number of matching results'),
      apis: z.array(apiEntrySchema).describe('Matching APIs and domains')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.searchApisAndDomains({
      query: ctx.input.query,
      specType: ctx.input.specType,
      visibility: ctx.input.visibility,
      state: ctx.input.state,
      owner: ctx.input.owner || ctx.config.owner,
      page: ctx.input.page,
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      order: ctx.input.order
    });

    let apis = result?.apis ?? [];
    let totalCount = result?.totalCount ?? apis.length;

    return {
      output: {
        totalCount,
        apis
      },
      message: `Found **${totalCount}** result(s) matching the search criteria.`
    };
  })
  .build();
