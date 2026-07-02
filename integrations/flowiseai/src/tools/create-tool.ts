import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let createTool = SlateTool.create(spec, {
  name: 'Create Tool',
  key: 'create_tool',
  description: `Create a new custom tool in Flowise that can be assigned to agents and chatflows. Define the tool's name, description, JSON schema, and function implementation.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new tool'),
      description: z.string().optional().describe('Description of what the tool does'),
      color: z.string().optional().describe('Display color for the tool'),
      schema: z
        .string()
        .optional()
        .describe("JSON schema defining the tool's input parameters"),
      func: z.string().optional().describe('JavaScript function implementation for the tool'),
      iconSrc: z.string().optional().describe('Icon source URL')
    })
  )
  .output(
    z.object({
      toolId: z.string().describe('ID of the newly created tool'),
      name: z.string().describe('Tool name'),
      description: z.string().optional().nullable().describe('Tool description'),
      createdDate: z.string().optional().describe('ISO 8601 creation date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.createTool(ctx.input);

    return {
      output: {
        toolId: result.id,
        name: result.name,
        description: result.description,
        createdDate: result.createdDate
      },
      message: `Created tool **${result.name}** (\`${result.id}\`).`
    };
  })
  .build();
