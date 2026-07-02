import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { functionToolSchema, mapFunctionTools, mapMemoryNames } from './shared';

let messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']).describe('Role of the message sender'),
  content: z.string().describe('Content of the message'),
  name: z.string().optional().describe('Name identifier for the message sender')
});

export let updatePipe = SlateTool.create(spec, {
  name: 'Update Pipe',
  key: 'update_pipe',
  description: `Update an existing AI pipe's configuration. Modify the model, prompts, temperature, and other settings of a pipe.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      pipeName: z.string().describe('Name of the pipe to update'),
      description: z.string().optional().describe('Updated description'),
      status: z.enum(['public', 'private']).optional().describe('Updated visibility status'),
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
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value pairs for variable substitution in pipe prompts'),
      tools: z
        .array(functionToolSchema)
        .optional()
        .describe('Function tools the model may call from this pipe'),
      toolChoice: z
        .enum(['auto', 'required'])
        .optional()
        .describe('Controls whether the model may or must call tools'),
      parallelToolCalls: z
        .boolean()
        .optional()
        .describe('Whether the model may call multiple tools in parallel'),
      memoryNames: z
        .array(z.string())
        .optional()
        .describe('Names of Langbase memories attached to this pipe'),
      responseFormat: z
        .enum(['text', 'json_object'])
        .optional()
        .describe('Response format for the pipe output')
    })
  )
  .output(
    z.object({
      pipeName: z.string().describe('Name of the updated pipe'),
      description: z.string().describe('Description of the pipe'),
      status: z.string().describe('Visibility status'),
      ownerLogin: z.string().describe('Owner account login'),
      url: z.string().describe('URL of the pipe')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let body: Record<string, any> = {};

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
    if (ctx.input.tools !== undefined) body.tools = mapFunctionTools(ctx.input.tools);
    if (ctx.input.toolChoice !== undefined) body.tool_choice = ctx.input.toolChoice;
    if (ctx.input.parallelToolCalls !== undefined)
      body.parallel_tool_calls = ctx.input.parallelToolCalls;
    if (ctx.input.memoryNames !== undefined)
      body.memory = mapMemoryNames(ctx.input.memoryNames);
    if (ctx.input.responseFormat !== undefined)
      body.response_format = { type: ctx.input.responseFormat };

    let result = await client.updatePipe(ctx.input.pipeName, body);

    return {
      output: {
        pipeName: result.name,
        description: result.description ?? '',
        status: result.status,
        ownerLogin: result.owner_login ?? '',
        url: result.url ?? ''
      },
      message: `Updated pipe **${result.name}**.`
    };
  })
  .build();
