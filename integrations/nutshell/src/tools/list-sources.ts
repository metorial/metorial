import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let listSources = SlateTool.create(spec, {
  name: 'List Sources',
  key: 'list_sources',
  description: `List lead sources in Nutshell CRM. Sources identify where leads originate from (e.g., referral, website, trade show).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchQuery: z.string().optional().describe('Search term to filter sources by name'),
      limit: z.number().optional().describe('Number of results per page (default: 50)'),
      page: z.number().optional().describe('Page number (default: 1)')
    })
  )
  .output(
    z.object({
      sources: z
        .array(
          z.object({
            sourceId: z.number().describe('ID of the source'),
            name: z.string().describe('Source name'),
            entityType: z.string().optional().describe('Entity type')
          })
        )
        .describe('List of sources'),
      count: z.number().describe('Number of sources returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let results: any[];
    if (ctx.input.searchQuery) {
      results = await client.searchSources(ctx.input.searchQuery);
    } else {
      results = await client.findSources({
        limit: ctx.input.limit,
        page: ctx.input.page
      });
    }

    let sources = results.map((s: any) => ({
      sourceId: s.id,
      name: s.name,
      entityType: s.entityType
    }));

    return {
      output: {
        sources,
        count: sources.length
      },
      message: `Found **${sources.length}** source(s).`
    };
  })
  .build();
