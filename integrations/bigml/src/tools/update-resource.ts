import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateResource = SlateTool.create(spec, {
  name: 'Update Resource',
  key: 'update_resource',
  description: `Update a BigML resource's mutable attributes. BigML resources are mostly immutable — only metadata fields like name, description, tags, and category can be updated after creation.`,
  constraints: [
    'Most resource fields are immutable after creation. Only metadata like name, description, tags, and category can be updated.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      resourceId: z
        .string()
        .describe('Full resource ID to update (e.g., "source/abc123", "model/abc123")'),
      name: z.string().optional().describe('New name for the resource'),
      description: z.string().optional().describe('New description for the resource'),
      tags: z.array(z.string()).optional().describe('New tags for the resource'),
      category: z.number().optional().describe('Category code for the resource')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('Updated resource ID'),
      name: z.string().optional().describe('Updated name'),
      statusCode: z.number().optional().describe('Status code'),
      statusMessage: z.string().optional().describe('Status message')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.description !== undefined) body.description = ctx.input.description;
    if (ctx.input.tags !== undefined) body.tags = ctx.input.tags;
    if (ctx.input.category !== undefined) body.category = ctx.input.category;

    let result = await client.updateResource(ctx.input.resourceId, body);

    return {
      output: {
        resourceId: result.resource ?? ctx.input.resourceId,
        name: result.name ?? ctx.input.name,
        statusCode: result.status?.code ?? result.code,
        statusMessage: result.status?.message
      },
      message: `Resource **${ctx.input.resourceId}** updated successfully.`
    };
  })
  .build();
