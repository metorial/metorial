import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let inputMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']).describe('Role of the message sender'),
  content: z.string().describe('Content of the message'),
  name: z.string().optional().describe('Name identifier'),
  toolCallId: z.string().optional().describe('Tool call ID for tool response messages')
});

export let runAgent = SlateTool.create(spec, {
  name: 'Run Agent',
  key: 'run_agent',
  description: `Run the Langbase runtime LLM agent directly, specifying all parameters at runtime. Supports 100+ LLMs across all major providers (OpenAI, Anthropic, Google, etc.). Unlike pipes, the agent requires specifying the model and LLM provider key per request.`,
  instructions: [
    'Model must be in provider:model format, e.g. "openai:gpt-4o-mini", "anthropic:claude-sonnet-4-20250514".',
    'An LLM provider API key is required for the specified provider.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe('LLM model in provider:model format, e.g. "openai:gpt-4o-mini"'),
      input: z
        .union([z.string(), z.array(inputMessageSchema)])
        .describe('Input text or array of messages'),
      llmProviderKey: z
        .string()
        .describe('API key for the LLM provider (e.g. OpenAI API key)'),
      instructions: z.string().optional().describe('System-level instructions for the agent'),
      temperature: z.number().optional().describe('Temperature for response randomness (0-2)'),
      topP: z.number().optional().describe('Top-p sampling parameter (0-1)'),
      maxTokens: z.number().optional().describe('Maximum number of tokens to generate'),
      presencePenalty: z.number().optional().describe('Presence penalty (-2 to 2)'),
      frequencyPenalty: z.number().optional().describe('Frequency penalty (-2 to 2)'),
      stop: z.array(z.string()).optional().describe('Stop sequences')
    })
  )
  .output(
    z.object({
      agentOutput: z.string().describe('Generated text output'),
      model: z.string().optional().describe('Model used for generation'),
      promptTokens: z.number().optional().describe('Number of prompt tokens'),
      completionTokens: z.number().optional().describe('Number of completion tokens'),
      totalTokens: z.number().optional().describe('Total tokens used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let body: Record<string, any> = {
      model: ctx.input.model
    };

    if (typeof ctx.input.input === 'string') {
      body.input = ctx.input.input;
    } else {
      body.input = ctx.input.input.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.name ? { name: m.name } : {}),
        ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {})
      }));
    }

    if (ctx.input.instructions !== undefined) body.instructions = ctx.input.instructions;
    if (ctx.input.temperature !== undefined) body.temperature = ctx.input.temperature;
    if (ctx.input.topP !== undefined) body.top_p = ctx.input.topP;
    if (ctx.input.maxTokens !== undefined) body.max_tokens = ctx.input.maxTokens;
    if (ctx.input.presencePenalty !== undefined)
      body.presence_penalty = ctx.input.presencePenalty;
    if (ctx.input.frequencyPenalty !== undefined)
      body.frequency_penalty = ctx.input.frequencyPenalty;
    if (ctx.input.stop !== undefined) body.stop = ctx.input.stop;

    let result = await client.runAgent(body, ctx.input.llmProviderKey);

    let usage = result.usage;

    return {
      output: {
        agentOutput: result.output ?? result.choices?.[0]?.message?.content ?? '',
        model: result.model,
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens
      },
      message: `Agent generated a response using \`${result.model}\` (${usage?.total_tokens ?? 'unknown'} tokens).`
    };
  })
  .build();
