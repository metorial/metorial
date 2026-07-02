import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let listTools = SlateTool.create(spec, {
  name: 'List Tools',
  key: 'list_tools',
  description: `Retrieve all custom tools available in Flowise. Tools define external capabilities (API calls, calculations, etc.) that agents can invoke.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      tools: z
        .array(
          z.object({
            toolId: z.string().describe('Unique tool ID'),
            name: z.string().describe('Tool name'),
            description: z.string().optional().nullable().describe('Tool description'),
            color: z.string().optional().nullable().describe('Display color'),
            iconSrc: z.string().optional().nullable().describe('Icon source URL'),
            schema: z.string().optional().nullable().describe('JSON schema definition'),
            func: z.string().optional().nullable().describe('Function implementation'),
            createdDate: z.string().optional().describe('ISO 8601 creation date'),
            updatedDate: z.string().optional().describe('ISO 8601 last update date')
          })
        )
        .describe('List of custom tools')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.listTools();
    let tools = Array.isArray(result) ? result : [];

    return {
      output: {
        tools: tools.map((t: any) => ({
          toolId: t.id,
          name: t.name,
          description: t.description,
          color: t.color,
          iconSrc: t.iconSrc,
          schema: t.schema,
          func: t.func,
          createdDate: t.createdDate,
          updatedDate: t.updatedDate
        }))
      },
      message: `Found **${tools.length}** tool(s).`
    };
  })
  .build();
