import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

export let listComponents = SlateTool.create(spec, {
  name: 'List Components',
  key: 'list_components',
  description: `List reusable components for a Webflow site. Use this to inspect component IDs and names before working with page content or site structure.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Unique identifier of the Webflow site'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of components to return')
    })
  )
  .output(
    z.object({
      components: z.array(z.any()).describe('Reusable Webflow components'),
      pagination: z
        .object({
          offset: z.number().optional(),
          limit: z.number().optional(),
          total: z.number().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    let data = await client.listComponents(ctx.input.siteId, {
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });
    let components = data.components ?? [];

    return {
      output: { components, pagination: data.pagination },
      message: `Found **${components.length}** component(s) on site **${ctx.input.siteId}**.`
    };
  })
  .build();
