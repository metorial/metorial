import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchTool = SlateTool.create(spec, {
  name: 'Search',
  key: 'search',
  description: `Search across murals, rooms, or templates within a workspace by name. Specify the **resourceType** to determine what to search for.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('ID of the workspace to search in'),
      query: z.string().min(1).describe('Search query string'),
      limit: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Maximum results per page; keep the same limit for subsequent pages'),
      nextToken: z
        .string()
        .optional()
        .describe('Pagination token from the previous search call'),
      resourceType: z
        .enum(['murals', 'rooms', 'templates'])
        .describe('Type of resource to search for')
    })
  )
  .output(
    z.object({
      nextToken: z.string().optional(),
      results: z.array(
        z.object({
          resourceId: z.string(),
          name: z.string().optional(),
          description: z.string().optional(),
          resourceType: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { workspaceId, query, resourceType } = ctx.input;
    let options = { limit: ctx.input.limit, next: ctx.input.nextToken };
    let nextToken: string | undefined;

    let results: Array<{
      resourceId: string;
      name?: string;
      description?: string;
      resourceType: string;
    }> = [];

    switch (resourceType) {
      case 'murals': {
        let data = await client.searchMurals(workspaceId, query, options);
        nextToken = data.next;
        results = data.value.map(m => ({
          resourceId: m.id,
          name: m.title,
          description: m.description,
          resourceType: 'mural'
        }));
        break;
      }
      case 'rooms': {
        let data = await client.searchRooms(workspaceId, query, options);
        nextToken = data.next;
        results = data.value.map(r => ({
          resourceId: r.id,
          name: r.name,
          description: r.description,
          resourceType: 'room'
        }));
        break;
      }
      case 'templates': {
        let data = await client.searchTemplates(workspaceId, query, options);
        nextToken = data.next;
        results = data.value.map(t => ({
          resourceId: t.id,
          name: t.name,
          description: t.description,
          resourceType: 'template'
        }));
        break;
      }
    }

    return {
      output: { results, nextToken },
      message: `Found **${results.length}** ${resourceType} matching "${query}".`
    };
  })
  .build();
