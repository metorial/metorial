import { SlateTool } from 'slates';
import { z } from 'zod';
import { rejectHumanloopOperation } from '../lib/retirement';
import { spec } from '../spec';

let templateMessageSchema = z
  .object({
    role: z
      .enum(['system', 'user', 'assistant', 'tool'])
      .describe('Role of the message sender'),
    content: z
      .string()
      .describe('Content of the message. Use {{variable}} syntax for template variables.'),
    name: z.string().optional().describe('Optional name for the message sender')
  })
  .describe('A message in the prompt template');

export let managePrompt = SlateTool.create(spec, {
  name: 'Manage Prompt',
  key: 'manage_prompt',
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
      promptId: z.string().optional().describe('Prompt ID (required for get, update, delete)'),
      path: z
        .string()
        .optional()
        .describe('Path for the prompt (e.g. "folder/my-prompt"). Used for create.'),
      model: z
        .string()
        .optional()
        .describe('Model identifier (e.g. "gpt-4o", "claude-3-opus"). Required for create.'),
      provider: z
        .string()
        .optional()
        .describe('Model provider (e.g. "openai", "anthropic", "cohere")'),
      endpoint: z
        .enum(['chat', 'complete'])
        .optional()
        .describe('Endpoint type for the prompt'),
      template: z
        .array(templateMessageSchema)
        .optional()
        .describe('Template messages for the prompt'),
      temperature: z.number().optional().describe('Sampling temperature (0-2)'),
      maxTokens: z.number().optional().describe('Maximum tokens to generate'),
      topP: z.number().optional().describe('Top-p sampling parameter'),
      stop: z.array(z.string()).optional().describe('Stop sequences'),
      versionName: z.string().optional().describe('Name for this version'),
      versionDescription: z.string().optional().describe('Description for this version'),
      description: z.string().optional().describe('Description for the prompt'),
      name: z.string().optional().describe('New name for the prompt (for update action)'),
      page: z.number().optional().describe('Page number for list action'),
      size: z.number().optional().describe('Page size for list action')
    })
  )
  .output(
    z.object({
      prompt: z.any().optional().describe('Prompt details'),
      prompts: z.array(z.any()).optional().describe('List of prompts'),
      total: z.number().optional().describe('Total number of prompts (for list)')
    })
  )
  .handleInvocation(async () => rejectHumanloopOperation())
  .build();
