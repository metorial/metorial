import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export const getTool = SlateTool.create(spec, {
  name: 'Get Tool',
  key: 'get_tool',
  description:
    'Retrieve a custom tool and its input schema and JavaScript implementation. Call list_tools to discover tool IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ toolId: z.string().min(1).describe('Custom tool ID from list_tools') }))
  .output(
    z.object({
      toolId: z.string(),
      name: z.string(),
      description: z.string().nullish(),
      color: z.string().nullish(),
      iconSrc: z.string().nullish(),
      schema: z.string().nullish(),
      func: z.string().nullish(),
      createdDate: z.string().optional(),
      updatedDate: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new FlowiseClient({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    const result = await client.getTool(ctx.input.toolId);
    return {
      output: {
        toolId: result.id,
        name: result.name,
        description: result.description,
        color: result.color,
        iconSrc: result.iconSrc,
        schema: result.schema,
        func: result.func,
        createdDate: result.createdDate,
        updatedDate: result.updatedDate
      },
      message: `Retrieved custom tool ${result.name}.`
    };
  })
  .build();
