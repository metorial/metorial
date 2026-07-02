import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listSpaces = SlateTool.create(spec, {
  name: 'List Spaces',
  key: 'list_spaces',
  description: `List Confluence spaces with optional filtering by space key, type, or status. Returns space metadata including name, key, and type.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      keys: z.array(z.string()).optional().describe('Filter by specific space keys'),
      type: z.string().optional().describe('Filter by space type (global, personal)'),
      status: z.string().optional().describe('Filter by status (current, archived)'),
      limit: z.number().optional().default(25).describe('Maximum number of spaces to return'),
      cursor: z.string().optional().describe('Pagination cursor'),
      sort: z.string().optional().describe('Sort order (e.g., "name", "-name")')
    })
  )
  .output(
    z.object({
      spaces: z.array(
        z.object({
          spaceId: z.string(),
          spaceKey: z.string(),
          name: z.string(),
          type: z.string().optional(),
          status: z.string().optional(),
          homepageId: z.string().optional(),
          webUrl: z.string().optional()
        })
      ),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let response = await client.getSpaces({
      keys: ctx.input.keys,
      type: ctx.input.type,
      status: ctx.input.status,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      sort: ctx.input.sort
    });

    let nextLink = response._links?.next;
    let nextCursor: string | undefined;
    if (nextLink) {
      let match = nextLink.match(/cursor=([^&]+)/);
      if (match) nextCursor = decodeURIComponent(match[1]!);
    }

    let spaces = response.results.map(s => ({
      spaceId: s.id,
      spaceKey: s.key,
      name: s.name,
      type: s.type,
      status: s.status,
      homepageId: s.homepageId,
      webUrl: s._links?.webui
    }));

    return {
      output: { spaces, nextCursor },
      message: `Found **${spaces.length}** spaces`
    };
  })
  .build();

export let getSpace = SlateTool.create(spec, {
  name: 'Get Space',
  key: 'get_space',
  description: `Retrieve a single Confluence space by its ID. Returns space metadata.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      spaceId: z.string().describe('The space ID to retrieve')
    })
  )
  .output(
    z.object({
      spaceId: z.string(),
      spaceKey: z.string(),
      name: z.string(),
      type: z.string().optional(),
      status: z.string().optional(),
      description: z.string().optional(),
      homepageId: z.string().optional(),
      webUrl: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let space = await client.getSpaceById(ctx.input.spaceId);

    return {
      output: {
        spaceId: space.id,
        spaceKey: space.key,
        name: space.name,
        type: space.type,
        status: space.status,
        description: space.description?.plain?.value,
        homepageId: space.homepageId,
        webUrl: space._links?.webui
      },
      message: `Retrieved space **${space.name}** (key: ${space.key})`
    };
  })
  .build();
