import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { functionToolSchema, mapFunctionTools, mapMemoryNames } from './shared';

let messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']).describe('Role of the message sender'),
  content: z
    .string()
    .nullable()
    .describe('Content of the message. Tool messages may use null.'),
  name: z.string().optional().describe('Name identifier'),
  toolCallId: z.string().optional().describe('Tool call ID for tool response messages')
});

export let runPipe = SlateTool.create(spec, {
  name: 'Run Pipe',
  key: 'run_pipe',
  description: `Run an AI pipe to generate a response. Send messages to a configured pipe and receive the LLM completion. Supports conversation threading via threadId, variable substitution, and optional LLM provider key override.`,
  instructions: [
    'Use the pipeApiKey if you have a pipe-specific API key, otherwise the account API key is used.',
    'Pass a threadId to continue an existing conversation. The response includes the threadId for follow-up messages.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      messages: z.array(messageSchema).describe('Messages to send to the pipe'),
      threadId: z
        .string()
        .optional()
        .describe('Thread ID to continue an existing conversation'),
      variables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value pairs for variable substitution in pipe prompts'),
      pipeApiKey: z
        .string()
        .optional()
        .describe('Pipe-specific API key. If not provided, the account API key is used.'),
      llmProviderKey: z
        .string()
        .optional()
        .describe('LLM provider API key to override the default one configured in the pipe'),
      memoryNames: z
        .array(z.string())
        .optional()
        .describe('Memory names to use at runtime instead of the pipe default memories'),
      tools: z
        .array(functionToolSchema)
        .optional()
        .describe('Function tools the model may call during this run')
    })
  )
  .output(
    z.object({
      completion: z.string().describe('Generated text completion'),
      threadId: z.string().optional().describe('Thread ID for continuing the conversation'),
      model: z.string().optional().describe('Model used for generation'),
      promptTokens: z.number().optional().describe('Number of tokens in the prompt'),
      completionTokens: z.number().optional().describe('Number of tokens in the completion'),
      totalTokens: z.number().optional().describe('Total tokens used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let body: Record<string, any> = {
      messages: ctx.input.messages.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.name ? { name: m.name } : {}),
        ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {})
      }))
    };

    if (ctx.input.threadId) body.threadId = ctx.input.threadId;
    if (ctx.input.variables) body.variables = ctx.input.variables;
    if (ctx.input.memoryNames) body.memory = mapMemoryNames(ctx.input.memoryNames);
    if (ctx.input.tools) body.tools = mapFunctionTools(ctx.input.tools);

    let result = await client.runPipe(body, {
      pipeApiKey: ctx.input.pipeApiKey,
      llmKey: ctx.input.llmProviderKey
    });

    let usage = result.raw?.usage;

    return {
      output: {
        completion: result.completion ?? '',
        threadId: result.threadId,
        model: result.raw?.model,
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens
      },
      message: `Pipe generated a response (${usage?.total_tokens ?? 'unknown'} tokens).${result.threadId ? ` Thread: \`${result.threadId}\`` : ''}`
    };
  })
  .build();
