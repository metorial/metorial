import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      items: z
        .array(z.record(z.string(), z.any()))
        .describe('List of organizational resource records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let pagination = { page: ctx.input.page, perPage: ctx.input.perPage };
    let result: any;

    if (ctx.input.resourceType === 'departments') {
      result = await client.listDepartments(pagination);
    } else if (ctx.input.resourceType === 'divisions') {
      result = await client.listDivisions(pagination);
    } else {
      result = await client.listLocations(pagination);
    }

    let items = result?.[ctx.input.resourceType] || [];

    return {
      output: { items },
      message: `Retrieved **${items.length}** ${ctx.input.resourceType}.`
    };
  })
  .build();
