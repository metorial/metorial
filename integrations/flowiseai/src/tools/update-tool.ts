import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let updateTool = SlateTool.create(spec, {
  name: 'Update Tool',
  key: 'update_tool',
  description: `Update an existing custom tool's properties such as name, description, schema, function implementation, or icon.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      toolId: z.string().describe('ID of the tool to update'),
      name: z.string().optional().describe('Updated tool name'),
      description: z.string().optional().describe('Updated description'),
      color: z.string().optional().describe('Updated display color'),
      schema: z.string().optional().describe('Updated JSON schema for input parameters'),
      func: z.string().optional().describe('Updated function implementation'),
      iconSrc: z.string().optional().describe('Updated icon source URL')
    })
  )
  .output(
    z.object({
      toolId: z.string().describe('ID of the updated tool'),
      name: z.string().describe('Updated tool name'),
      description: z.string().optional().nullable().describe('Updated description'),
      updatedDate: z.string().optional().describe('ISO 8601 last update date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let { toolId, ...updateData } = ctx.input;
    let result = await client.updateTool(toolId, updateData);

    return {
      output: {
        toolId: result.id,
        name: result.name,
        description: result.description,
        updatedDate: result.updatedDate
      },
      message: `Updated tool **${result.name}** (\`${result.id}\`).`
    };
  })
  .build();
