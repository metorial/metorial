import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']).describe('Role of the message sender'),
  content: z.string().describe('Content of the message'),
  name: z.string().optional().describe('Name identifier for the message sender')
});

export let createPipe = SlateTool.create(spec, {
  name: 'Create Pipe',
  key: 'create_pipe',
  description: `Create a new AI pipe (agent) in Langbase. Pipes are configurable AI agents that can generate text, chat with users, and perform various AI tasks. You can configure the LLM model, system prompts, temperature, and attach memory for RAG-based responses.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the pipe. Must be unique within your account.'),
      description: z.string().optional().describe('Description of the pipe'),
      status: z
        .enum(['public', 'private'])
        .optional()
        .describe('Visibility status of the pipe'),
      model: z
        .string()
        .optional()
        .describe('LLM model in provider:model format, e.g. "openai:gpt-4o-mini"'),
      stream: z.boolean().optional().describe('Whether to enable streaming responses'),
      json: z.boolean().optional().describe('Whether to enable JSON output mode'),
      store: z.boolean().optional().describe('Whether to store conversation history'),
      moderate: z.boolean().optional().describe('Whether to enable content moderation'),
      topP: z.number().optional().describe('Top-p sampling parameter (0-1)'),
      maxTokens: z.number().optional().describe('Maximum number of tokens to generate'),
      temperature: z.number().optional().describe('Temperature for response randomness (0-2)'),
      presencePenalty: z.number().optional().describe('Presence penalty (-2 to 2)'),
      frequencyPenalty: z.number().optional().describe('Frequency penalty (-2 to 2)'),
      stop: z.array(z.string()).optional().describe('Stop sequences'),
      messages: z
        .array(messageSchema)
        .optional()
        .describe('System prompts and few-shot examples'),
      variables: z
        .array(z.string())
        .optional()
        .describe('Variable names used in the pipe prompts'),
      upsert: z.boolean().optional().describe('If true, update the pipe if it already exists')
    })
  )
  .output(
    z.object({
      pipeName: z.string().describe('Name of the created pipe'),
      description: z.string().describe('Description of the pipe'),
      status: z.string().describe('Visibility status'),
      ownerLogin: z.string().describe('Owner account login'),
      url: z.string().describe('URL of the pipe'),
      type: z.string().describe('Type of pipe (chat, generate, or run)'),
      pipeApiKey: z.string().describe('Pipe-specific API key for running this pipe')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let body: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.description !== undefined) body.description = ctx.input.description;
    if (ctx.input.status !== undefined) body.status = ctx.input.status;
    if (ctx.input.model !== undefined) body.model = ctx.input.model;
    if (ctx.input.stream !== undefined) body.stream = ctx.input.stream;
    if (ctx.input.json !== undefined) body.json = ctx.input.json;
    if (ctx.input.store !== undefined) body.store = ctx.input.store;
    if (ctx.input.moderate !== undefined) body.moderate = ctx.input.moderate;
    if (ctx.input.topP !== undefined) body.top_p = ctx.input.topP;
    if (ctx.input.maxTokens !== undefined) body.max_tokens = ctx.input.maxTokens;
    if (ctx.input.temperature !== undefined) body.temperature = ctx.input.temperature;
    if (ctx.input.presencePenalty !== undefined)
      body.presence_penalty = ctx.input.presencePenalty;
    if (ctx.input.frequencyPenalty !== undefined)
      body.frequency_penalty = ctx.input.frequencyPenalty;
    if (ctx.input.stop !== undefined) body.stop = ctx.input.stop;
    if (ctx.input.messages !== undefined) body.messages = ctx.input.messages;
    if (ctx.input.variables !== undefined) body.variables = ctx.input.variables;
    if (ctx.input.upsert !== undefined) body.upsert = ctx.input.upsert;

    let result = await client.createPipe(body);

    return {
      output: {
        pipeName: result.name,
        description: result.description ?? '',
        status: result.status,
        ownerLogin: result.owner_login,
        url: result.url,
        type: result.type ?? 'chat',
        pipeApiKey: result.api_key ?? ''
      },
      message: `Created pipe **${result.name}** (${result.status}). Pipe API key: \`${result.api_key}\``
    };
  })
  .build();
