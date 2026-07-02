import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchFacebook = SlateTool.create(spec, {
  name: 'Search',
  key: 'search_facebook',
  description: `Search for Pages or Places on Facebook. Returns matching results with basic details such as name, category, and location (for places).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query string'),
      type: z.enum(['page', 'place']).describe('Type of object to search for'),
      limit: z.number().optional().describe('Maximum number of results (default: 25)')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            objectId: z.string().describe('Object ID'),
            name: z.string().describe('Object name'),
            category: z.string().optional().describe('Category of the object'),
            link: z.string().optional().describe('URL to the object'),
            fanCount: z.number().optional().describe('Number of fans/likes (for Pages)'),
            pictureUrl: z.string().optional().describe('Profile picture URL'),
            location: z.any().optional().describe('Location details (for Places)')
          })
        )
        .describe('Search results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.search(ctx.input.query, ctx.input.type, {
      limit: ctx.input.limit
    });

    return {
      output: {
        results: result.data.map((item: any) => ({
          objectId: item.id,
          name: item.name,
          category: item.category,
          link: item.link,
          fanCount: item.fan_count,
          pictureUrl: item.picture?.data?.url,
          location: item.location
        }))
      },
      message: `Found **${result.data.length}** result(s) for "${ctx.input.query}".`
    };
  })
  .build();
