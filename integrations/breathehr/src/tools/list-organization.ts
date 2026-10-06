import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pageParams, paginationSchema, readRows } from '../lib/response';
import { spec } from '../spec';

export let listOrganization = SlateTool.create(spec, {
  name: 'List Organization Structure',
  key: 'list_organization',
  description: `Retrieve organizational structure data from Breathe HR. Fetch departments, divisions, or locations in a single call by specifying the resource type.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['departments', 'divisions', 'locations'])
        .describe('The type of organizational resource to list'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      pagination: paginationSchema.optional(),
      items: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of organizational resource records')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });

    const result = await client.list(
      ctx.input.resourceType,
      pageParams(ctx.input, ctx.input.resourceType === 'departments'),
      ctx.input.resourceType === 'departments'
    );
    const items = readRows(result, ctx.input.resourceType);
    return {
      output: { items, pagination: result.pagination },
      message: `Retrieved **${items.length}** record(s).`
    };
  })
  .build();
