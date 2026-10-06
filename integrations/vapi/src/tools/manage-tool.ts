import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTool = SlateTool.create(spec, {
  name: 'Manage Tool',
  key: 'manage_tool',
  description: `Create, update, retrieve, or delete tools that assistants can invoke during conversations. Configure function and direct API request tools with the typed fields, or use configuration for other current Vapi tool types such as endCall, handoff, and transferCall. Use list_tools to discover reusable tool IDs.`,
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
      configuration: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Additional writable fields for the selected Vapi tool type, such as destinations for handoff or transferCall; excludes type and resource metadata'
        ),
      name: z.string().optional().describe('Name of the tool'),
      url: z.string().optional().describe('Endpoint URL for apiRequest tools'),
      method: z
        .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
        .optional()
        .describe('HTTP method for apiRequest tools'),
      body: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Request body JSON Schema for apiRequest tools'),
      headers: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Header JSON Schema for apiRequest tools'),
      description: z
        .string()
        .optional()
        .describe('Description of what the tool does for the LLM'),
      function: z
        .object({
          name: z.string().optional().describe('Function name'),
          description: z.string().optional().describe('Function description'),
          strict: z.boolean().optional().describe('Use strict function parameters'),
          parameters: z.any().optional().describe('JSON Schema for the function parameters')
        })
        .optional()
        .describe('Function definition for function/API request tools'),
      server: z
        .object({
          url: z
            .string()
            .optional()
            .describe('Function webhook URL; legacy alias for apiRequest endpoint URL'),
          method: z
            .string()
            .optional()
            .describe('HTTP method (GET, POST, PUT, DELETE, PATCH)'),
          headers: z.record(z.string(), z.string()).optional().describe('Custom headers'),
          body: z
            .any()
            .optional()
            .describe('Legacy alias for the apiRequest request body JSON Schema')
        })
        .optional()
        .describe('Server configuration for API request tools')
    })
  )
  .output(
    z.object({
      toolId: z.string().optional().describe('ID of the tool'),
      type: z.string().optional().describe('Tool type'),
      configuration: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full provider configuration and metadata for the saved tool'),
      name: z.string().optional().describe('Name of the tool'),
      url: z.string().optional().describe('Endpoint URL for apiRequest tools'),
      method: z
        .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
        .optional()
        .describe('HTTP method for apiRequest tools'),
      body: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Request body JSON Schema for apiRequest tools'),
      headers: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Header JSON Schema for apiRequest tools'),
      description: z.string().optional().describe('Description of the tool'),
      function: z.any().optional().describe('Function definition'),
      server: z.any().optional().describe('Server configuration'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the tool was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token, ctx.auth.region);
    let { action, toolId } = ctx.input;

    if (action === 'get') {
      if (!toolId) throw createApiServiceError('toolId is required for get action');
      let tool = await client.getTool(toolId);
      return {
        output: {
          toolId: tool.id,
          type: tool.type,
          configuration: tool,
          name: tool.name ?? tool.function?.name,
          description: tool.description ?? tool.function?.description,
          url: tool.url,
          method: tool.method,
          body: tool.body,
          headers: tool.headers,
          function: tool.function,
          server: tool.server,
          createdAt: tool.createdAt,
          updatedAt: tool.updatedAt
        },
        message: `Retrieved tool **${tool.name || tool.id}** (${tool.type}).`
      };
    }

    if (action === 'delete') {
      if (!toolId) throw createApiServiceError('toolId is required for delete action');
      await client.deleteTool(toolId);
      return {
        output: { toolId, deleted: true },
        message: `Deleted tool **${toolId}**.`
      };
    }

    if (action === 'create' && !ctx.input.type)
      throw createApiServiceError('type is required for creating a tool.');
    if (action === 'update' && !toolId)
      throw createApiServiceError('toolId is required for update action');
    let current = action === 'update' && toolId ? await client.getTool(toolId) : undefined;
    let type = ctx.input.type ?? current?.type;
    if (current && type !== current.type)
      throw createApiServiceError(
        'A saved tool type cannot be changed. Create a new tool for the new type.'
      );
    let body: Record<string, any> = { ...ctx.input.configuration };
    if (['id', 'orgId', 'createdAt', 'updatedAt', 'type'].some(key => key in body))
      throw createApiServiceError(
        'configuration must contain only writable tool settings; provide type separately.'
      );
    if (type === 'function') {
      let functionDefinition = {
        ...current?.function,
        ...body.function,
        ...ctx.input.function
      };
      if (ctx.input.name !== undefined) functionDefinition.name = ctx.input.name;
      if (ctx.input.description !== undefined)
        functionDefinition.description = ctx.input.description;
      if (!functionDefinition.name)
        throw createApiServiceError('Function tools require function.name or name.');
      body.type = type;
      body.function = functionDefinition;
      if (ctx.input.server) {
        if (ctx.input.server.method || ctx.input.server.body !== undefined) {
          throw createApiServiceError(
            'Function webhooks do not accept method or body; use an apiRequest tool for direct HTTP requests.'
          );
        }
        body.server = { ...current?.server, ...body.server, ...ctx.input.server };
      }
    } else if (type === 'apiRequest') {
      body.type = type;
      if (ctx.input.name !== undefined) body.name = ctx.input.name;
      if (ctx.input.description !== undefined) body.description = ctx.input.description;
      let url = ctx.input.url ?? ctx.input.server?.url ?? body.url;
      let method = ctx.input.method ?? ctx.input.server?.method ?? body.method;
      if (url !== undefined) body.url = url;
      if (method !== undefined) body.method = method;
      if (ctx.input.body !== undefined || ctx.input.server?.body !== undefined)
        body.body = ctx.input.body ?? ctx.input.server?.body;
      if (ctx.input.headers) body.headers = ctx.input.headers;
      else if (ctx.input.server?.headers) {
        body.headers = {
          type: 'object',
          properties: Object.fromEntries(
            Object.entries(ctx.input.server.headers).map(([key, value]) => [
              key,
              { type: 'string', enum: [value] }
            ])
          ),
          required: Object.keys(ctx.input.server.headers)
        };
      }
      if (action === 'create' && (!url || !method))
        throw createApiServiceError(
          'API request tools require url and method, directly, through server, or through configuration.'
        );
      if (ctx.input.function)
        throw createApiServiceError(
          'API request tools use body JSON Schema rather than function. Use a function tool for a function definition.'
        );
    } else {
      body.type = type;
      if (ctx.input.name !== undefined) body.name = ctx.input.name;
      if (ctx.input.description !== undefined) body.description = ctx.input.description;
      if (ctx.input.function !== undefined) body.function = ctx.input.function;
      if (ctx.input.server !== undefined) body.server = ctx.input.server;
    }

    if (action === 'create') {
      let tool = await client.createTool(body);
      return {
        output: {
          toolId: tool.id,
          type: tool.type,
          configuration: tool,
          name: tool.name ?? tool.function?.name,
          description: tool.description ?? tool.function?.description,
          url: tool.url,
          method: tool.method,
          body: tool.body,
          headers: tool.headers,
          function: tool.function,
          server: tool.server,
          createdAt: tool.createdAt,
          updatedAt: tool.updatedAt
        },
        message: `Created tool **${tool.name || tool.id}** (${tool.type}).`
      };
    }

    if (action === 'update') {
      if (!toolId) throw createApiServiceError('toolId is required for update action');
      let tool = await client.updateTool(toolId, body);
      return {
        output: {
          toolId: tool.id,
          type: tool.type,
          configuration: tool,
          name: tool.name ?? tool.function?.name,
          description: tool.description ?? tool.function?.description,
          url: tool.url,
          method: tool.method,
          body: tool.body,
          headers: tool.headers,
          function: tool.function,
          server: tool.server,
          createdAt: tool.createdAt,
          updatedAt: tool.updatedAt
        },
        message: `Updated tool **${tool.name || tool.id}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
