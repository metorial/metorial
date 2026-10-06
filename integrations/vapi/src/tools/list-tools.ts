import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const listTools = SlateTool.create(spec, {
  name: 'List Tools',
  key: 'list_tools',
  description:
    'Discover reusable Vapi tools and their IDs for assistant model.toolIds or manage_tool.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(0)
        .max(1000)
        .optional()
        .describe('Maximum results; defaults to 100'),
      createdAfter: z.string().optional().describe('Exclusive ISO timestamp lower bound'),
      createdBefore: z.string().optional().describe('Exclusive ISO timestamp upper bound')
    })
  )
  .output(
    z.object({
      tools: z.array(
        z.object({
          toolId: z.string(),
          type: z.string().optional(),
          name: z.string().optional(),
          description: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let tools = await new Client(ctx.auth.token, ctx.auth.region).listTools({
      limit: ctx.input.limit,
      createdAtGt: ctx.input.createdAfter,
      createdAtLt: ctx.input.createdBefore
    });
    return {
      output: {
        tools: tools.map(tool => ({
          toolId: tool.id,
          type: tool.type,
          name: tool.name ?? tool.function?.name,
          description: tool.description ?? tool.function?.description,
          createdAt: tool.createdAt,
          updatedAt: tool.updatedAt
        })),
        count: tools.length
      },
      message: `Found ${tools.length} tool(s).`
    };
  })
  .build();
