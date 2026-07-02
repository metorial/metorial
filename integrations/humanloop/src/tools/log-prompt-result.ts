import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let logPromptResult = SlateTool.create(spec, {
  name: 'Log Prompt Result',
  key: 'log_prompt_result',
  description: `Log an LLM call result to Humanloop. Use this when calling model providers directly (not through Humanloop's proxy) and you want to record the result for observability, evaluation, or feedback. Captures inputs, outputs, token usage, latency, and optional metadata.`,
  instructions: [
    'Provide either a promptId/path to associate the log with a prompt, or a versionId for a specific version.',
    'Use traceParentId to link logs in a parent-child trace relationship for multi-step pipelines.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      promptId: z.string().optional().describe('ID of the prompt to log against'),
      path: z.string().optional().describe('Path of the prompt to log against'),
      versionId: z.string().optional().describe('Specific version ID to log against'),
      inputs: z
        .record(z.string(), z.any())
        .optional()
        .describe('Input variables used for the call'),
      output: z.string().optional().describe('Generated text output from the model'),
      outputMessage: z
        .object({
          role: z.string().describe('Role of the message'),
          content: z.string().describe('Content of the message'),
          toolCalls: z.array(z.any()).optional().describe('Tool calls in the message')
        })
        .optional()
        .describe('Full output message object'),
      messages: z
        .array(
          z.object({
            role: z.string().describe('Role of the message'),
            content: z.string().describe('Content of the message')
          })
        )
        .optional()
        .describe('Conversation messages'),
      error: z.string().optional().describe('Error message if the call failed'),
      promptTokens: z.number().optional().describe('Number of input tokens'),
      outputTokens: z.number().optional().describe('Number of output tokens'),
      promptCost: z.number().optional().describe('Cost of the prompt tokens'),
      outputCost: z.number().optional().describe('Cost of the output tokens'),
      latency: z.number().optional().describe('Latency in seconds'),
      traceParentId: z.string().optional().describe('Parent log ID for trace linking'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional metadata to attach')
    })
  )
  .output(
    z.object({
      logId: z.string().describe('ID of the created log'),
      raw: z.any().optional().describe('Full response from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.promptId) body.id = ctx.input.promptId;
    if (ctx.input.path) body.path = ctx.input.path;
    if (ctx.input.versionId) body.version_id = ctx.input.versionId;
    if (ctx.input.inputs) body.inputs = ctx.input.inputs;
    if (ctx.input.output) body.output = ctx.input.output;
    if (ctx.input.outputMessage) {
      body.output_message = {
        role: ctx.input.outputMessage.role,
        content: ctx.input.outputMessage.content,
        tool_calls: ctx.input.outputMessage.toolCalls
      };
    }
    if (ctx.input.messages) body.messages = ctx.input.messages;
    if (ctx.input.error) body.error = ctx.input.error;
    if (ctx.input.traceParentId) body.trace_parent_id = ctx.input.traceParentId;
    if (ctx.input.metadata) body.metadata = ctx.input.metadata;

    if (ctx.input.promptTokens !== undefined || ctx.input.outputTokens !== undefined) {
      body.usage = {};
      if (ctx.input.promptTokens !== undefined)
        body.usage.prompt_tokens = ctx.input.promptTokens;
      if (ctx.input.outputTokens !== undefined)
        body.usage.completion_tokens = ctx.input.outputTokens;
    }

    if (ctx.input.promptCost !== undefined || ctx.input.outputCost !== undefined) {
      body.cost = {};
      if (ctx.input.promptCost !== undefined) body.cost.prompt = ctx.input.promptCost;
      if (ctx.input.outputCost !== undefined) body.cost.completion = ctx.input.outputCost;
    }

    if (ctx.input.latency !== undefined) body.provider_latency = ctx.input.latency;

    let result = await client.logPrompt(body);

    return {
      output: {
        logId: result.id,
        raw: result
      },
      message: `Logged prompt result (log ID: **${result.id}**).`
    };
  })
  .build();
