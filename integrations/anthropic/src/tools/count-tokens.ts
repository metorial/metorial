import { SlateTool } from 'slates';
import { z } from 'zod';
import { AnthropicClient } from '../lib/client';
import { spec } from '../spec';

let messageSchema = z.object({
  role: z.enum(['user', 'assistant']).describe('Role of the message sender'),
  content: z
    .union([z.string(), z.array(z.record(z.string(), z.unknown()))])
    .describe('Message content')
});

export let countTokens = SlateTool.create(spec, {
  name: 'Count Tokens',
  key: 'count_tokens',
  description: `Count the number of tokens in a message without sending it. Useful for estimating costs, managing context window limits, and planning prompt strategies before making actual API calls.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      model: z.string().describe('Claude model ID to use for token counting'),
      messages: z.array(messageSchema).describe('Messages to count tokens for'),
      system: z.string().optional().describe('System prompt to include in the count'),
      tools: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Tool definitions to include in the count'),
      thinking: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Extended thinking configuration to include in the count'),
      betaHeaders: z
        .array(z.string())
        .optional()
        .describe('Anthropic beta headers to send with this request')
    })
  )
  .output(
    z.object({
      inputTokens: z
        .number()
        .describe('Total number of tokens across messages, system prompt, and tools')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AnthropicClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let messages = ctx.input.messages as Array<{
      role: 'user' | 'assistant';
      content: string | Record<string, unknown>[];
    }>;
    let result = await client.countTokens({
      model: ctx.input.model,
      messages,
      system: ctx.input.system,
      tools: ctx.input.tools,
      thinking: ctx.input.thinking,
      betaHeaders: ctx.input.betaHeaders
    });

    return {
      output: {
        inputTokens: result.inputTokens
      },
      message: `Token count for model **${ctx.input.model}**: **${result.inputTokens}** input tokens.`
    };
  })
  .build();
