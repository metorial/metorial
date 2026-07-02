import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTool = SlateTool.create(spec, {
  name: 'Manage Tool',
  key: 'manage_tool',
  description: `Create, update, retrieve, or delete tools that assistants can invoke during conversations. Tool types include API requests (HTTP calls), code execution, and MCP tools. Configure custom headers, request bodies, and variable extraction from responses.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'get', 'delete']).describe('Action to perform'),
      toolId: z.string().optional().describe('Tool ID (required for get, update, delete)'),
      type: z.string().optional().describe('Tool type (e.g. apiRequest, function, code, mcp)'),
      name: z.string().optional().describe('Name of the tool'),
      description: z
        .string()
        .optional()
        .describe('Description of what the tool does for the LLM'),
      function: z
        .object({
          name: z.string().optional().describe('Function name'),
          description: z.string().optional().describe('Function description'),
          parameters: z.any().optional().describe('JSON Schema for the function parameters')
        })
        .optional()
        .describe('Function definition for function/API request tools'),
      server: z
        .object({
          url: z.string().optional().describe('Server URL for API request tools'),
          method: z
            .string()
            .optional()
            .describe('HTTP method (GET, POST, PUT, DELETE, PATCH)'),
          headers: z.record(z.string(), z.string()).optional().describe('Custom headers'),
          body: z.any().optional().describe('Request body template')
        })
        .optional()
        .describe('Server configuration for API request tools')
    })
  )
  .output(
    z.object({
      toolId: z.string().optional().describe('ID of the tool'),
      type: z.string().optional().describe('Tool type'),
      name: z.string().optional().describe('Name of the tool'),
      description: z.string().optional().describe('Description of the tool'),
      function: z.any().optional().describe('Function definition'),
      server: z.any().optional().describe('Server configuration'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the tool was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, toolId } = ctx.input;

    if (action === 'get') {
      if (!toolId) throw new Error('toolId is required for get action');
      let tool = await client.getTool(toolId);
      return {
        output: {
          toolId: tool.id,
          type: tool.type,
          name: tool.name,
          description: tool.description,
          function: tool.function,
          server: tool.server,
          createdAt: tool.createdAt,
          updatedAt: tool.updatedAt
        },
        message: `Retrieved tool **${tool.name || tool.id}** (${tool.type}).`
      };
    }

    if (action === 'delete') {
      if (!toolId) throw new Error('toolId is required for delete action');
      await client.deleteTool(toolId);
      return {
        output: { toolId, deleted: true },
        message: `Deleted tool **${toolId}**.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.type) body.type = ctx.input.type;
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.function) body.function = ctx.input.function;
    if (ctx.input.server) body.server = ctx.input.server;

    if (action === 'create') {
      let tool = await client.createTool(body);
      return {
        output: {
          toolId: tool.id,
          type: tool.type,
          name: tool.name,
          description: tool.description,
          function: tool.function,
          server: tool.server,
          createdAt: tool.createdAt,
          updatedAt: tool.updatedAt
        },
        message: `Created tool **${tool.name || tool.id}** (${tool.type}).`
      };
    }

    if (action === 'update') {
      if (!toolId) throw new Error('toolId is required for update action');
      let tool = await client.updateTool(toolId, body);
      return {
        output: {
          toolId: tool.id,
          type: tool.type,
          name: tool.name,
          description: tool.description,
          function: tool.function,
          server: tool.server,
          createdAt: tool.createdAt,
          updatedAt: tool.updatedAt
        },
        message: `Updated tool **${tool.name || tool.id}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
