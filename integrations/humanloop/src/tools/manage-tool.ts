import { SlateTool } from 'slates';
import { z } from 'zod';
import { rejectHumanloopOperation } from '../lib/retirement';
import { spec } from '../spec';

export let manageTool = SlateTool.create(spec, {
  name: 'Manage Tool',
  key: 'manage_tool',
  description:
    'DEPRECATED — Humanloop shut down on September 8, 2025. This operation is unavailable; the tool is retained only for compatibility.',
  instructions: [
    'Humanloop is retired. Do not use this tool for new workflows; use data exported before September 8, 2025 with your chosen replacement platform.'
  ],
  tags: {
    destructive: false,
    readOnly: false,
    deprecated: true
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
  .handleInvocation(async () => rejectHumanloopOperation())
  .build();
