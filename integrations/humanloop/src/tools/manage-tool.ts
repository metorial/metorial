import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTool = SlateTool.create(spec, {
  name: 'Manage Tool',
  key: 'manage_tool',
  description: `Create, update, retrieve, or delete Humanloop tools. Tools represent external functions or capabilities callable by Prompts and Agents. Each tool version is defined by its source code and function schema. Supports tool types including json_schema, python, snippet, and API calls.`,
  instructions: [
    'Provide a JSON Schema for the function parameters to enable structured function calling.',
    'For Python tools, include the source code in the sourceCode field.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'get', 'list', 'delete'])
        .describe('Action to perform'),
      toolId: z.string().optional().describe('Tool ID (required for get, update, delete)'),
      path: z
        .string()
        .optional()
        .describe('Path for the tool (e.g. "folder/my-tool"). Used for create.'),
      toolType: z
        .enum([
          'json_schema',
          'python',
          'snippet',
          'get_api_call',
          'pinecone_search',
          'google',
          'mock'
        ])
        .optional()
        .describe('Type of tool'),
      functionName: z.string().optional().describe('Name of the function'),
      functionDescription: z
        .string()
        .optional()
        .describe('Description of what the function does'),
      parameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('JSON Schema for the function parameters'),
      sourceCode: z.string().optional().describe('Source code for Python tools'),
      setupValues: z
        .record(z.string(), z.any())
        .optional()
        .describe('Setup values for the tool (e.g. API keys for search tools)'),
      versionName: z.string().optional().describe('Name for this version'),
      versionDescription: z.string().optional().describe('Description for this version'),
      name: z.string().optional().describe('New name for the tool (for update)'),
      page: z.number().optional().describe('Page number for list action'),
      size: z.number().optional().describe('Page size for list action')
    })
  )
  .output(
    z.object({
      tool: z.any().optional().describe('Tool details'),
      tools: z.array(z.any()).optional().describe('List of tools'),
      total: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listTools({
        page: ctx.input.page,
        size: ctx.input.size
      });
      return {
        output: { tools: result.records, total: result.total },
        message: `Found **${result.total}** tools.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.toolId) throw new Error('toolId is required for get action');
      let tool = await client.getTool(ctx.input.toolId);
      return {
        output: { tool },
        message: `Retrieved tool **${tool.name || tool.path}**.`
      };
    }

    if (ctx.input.action === 'create') {
      let body: Record<string, any> = {};
      if (ctx.input.path) body.path = ctx.input.path;
      if (ctx.input.toolId) body.id = ctx.input.toolId;
      if (ctx.input.toolType) body.tool_type = ctx.input.toolType;
      if (ctx.input.sourceCode) body.source_code = ctx.input.sourceCode;
      if (ctx.input.setupValues) body.setup_values = ctx.input.setupValues;
      if (ctx.input.versionName) body.version_name = ctx.input.versionName;
      if (ctx.input.versionDescription)
        body.version_description = ctx.input.versionDescription;

      if (ctx.input.functionName || ctx.input.functionDescription || ctx.input.parameters) {
        body.function = {};
        if (ctx.input.functionName) body.function.name = ctx.input.functionName;
        if (ctx.input.functionDescription)
          body.function.description = ctx.input.functionDescription;
        if (ctx.input.parameters) body.function.parameters = ctx.input.parameters;
      }

      let tool = await client.upsertTool(body);
      return {
        output: { tool },
        message: `Created/updated tool **${tool.name || tool.path}** (type: ${ctx.input.toolType || 'unknown'}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.toolId) throw new Error('toolId is required for update action');
      let body: Record<string, any> = {};
      if (ctx.input.path) body.path = ctx.input.path;
      if (ctx.input.name) body.name = ctx.input.name;
      let tool = await client.updateTool(ctx.input.toolId, body);
      return {
        output: { tool },
        message: `Updated tool **${tool.name || tool.path}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.toolId) throw new Error('toolId is required for delete action');
      await client.deleteTool(ctx.input.toolId);
      return {
        output: {},
        message: `Deleted tool **${ctx.input.toolId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
