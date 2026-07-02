import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
  description: `Create, update, or retrieve prompts with versioned templates. Supports creating new prompts with model configuration and template messages, updating prompt metadata (path, name), and fetching prompt details including version history. Use this to manage your LLM prompt configurations.`,
  instructions: [
    'To create or update a prompt version, provide either a path (to create by path) or a promptId (to update existing).',
    'Template messages use {{variable}} syntax for input variables.',
    'Each unique combination of template, model, and parameters creates a new immutable version automatically.'
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
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listPrompts({
        page: ctx.input.page,
        size: ctx.input.size
      });
      return {
        output: {
          prompts: result.records,
          total: result.total
        },
        message: `Found **${result.total}** prompts (page ${result.page}/${Math.ceil(result.total / result.size)}).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.promptId) throw new Error('promptId is required for get action');
      let prompt = await client.getPrompt(ctx.input.promptId, {
        environment: ctx.config.environment
      });
      return {
        output: { prompt },
        message: `Retrieved prompt **${prompt.name || prompt.path}** (version: ${prompt.version_id}).`
      };
    }

    if (ctx.input.action === 'create') {
      let body: Record<string, any> = {};
      if (ctx.input.path) body.path = ctx.input.path;
      if (ctx.input.promptId) body.id = ctx.input.promptId;
      if (ctx.input.model) body.model = ctx.input.model;
      if (ctx.input.provider) body.provider = ctx.input.provider;
      if (ctx.input.endpoint) body.endpoint = ctx.input.endpoint;
      if (ctx.input.template) body.template = ctx.input.template;
      if (ctx.input.temperature !== undefined) body.temperature = ctx.input.temperature;
      if (ctx.input.maxTokens !== undefined) body.max_tokens = ctx.input.maxTokens;
      if (ctx.input.topP !== undefined) body.top_p = ctx.input.topP;
      if (ctx.input.stop) body.stop = ctx.input.stop;
      if (ctx.input.versionName) body.version_name = ctx.input.versionName;
      if (ctx.input.versionDescription)
        body.version_description = ctx.input.versionDescription;
      if (ctx.input.description) body.description = ctx.input.description;

      let prompt = await client.upsertPrompt(body);
      return {
        output: { prompt },
        message: `Created/updated prompt **${prompt.name || prompt.path}** (version: ${prompt.version_id}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.promptId) throw new Error('promptId is required for update action');
      let body: Record<string, any> = {};
      if (ctx.input.path) body.path = ctx.input.path;
      if (ctx.input.name) body.name = ctx.input.name;
      let prompt = await client.updatePrompt(ctx.input.promptId, body);
      return {
        output: { prompt },
        message: `Updated prompt **${prompt.name || prompt.path}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.promptId) throw new Error('promptId is required for delete action');
      await client.deletePrompt(ctx.input.promptId);
      return {
        output: {},
        message: `Deleted prompt **${ctx.input.promptId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
