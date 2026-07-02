import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let messageSchema = z.object({
  role: z
    .enum(['system', 'developer', 'user', 'assistant'])
    .describe('The role of the message author'),
  content: z.string().describe('The content of the message')
});

export let chatCompletion = SlateTool.create(spec, {
  name: 'Chat Completion',
  key: 'chat_completion',
  description: `Generate text responses using 400+ LLM models including GPT, Claude, Gemini, DeepSeek, Llama, and Qwen.
Supports system prompts, multi-turn conversations, temperature control, JSON mode, and web search.
Use this for text generation, code generation, reasoning, question answering, and conversational AI.`,
  instructions: [
    'Set the model to the desired LLM model ID, e.g. "gpt-4o", "deepseek/deepseek-r1", "meta-llama/Llama-3.3-70B-Instruct-Turbo".',
    'Use the system role for instructions and the user role for prompts.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe(
          'Model ID to use, e.g. "gpt-4o", "deepseek/deepseek-r1", "claude-3.5-sonnet"'
        ),
      messages: z
        .array(messageSchema)
        .describe('Conversation messages with roles and content'),
      temperature: z
        .number()
        .min(0)
        .max(2)
        .optional()
        .describe(
          'Sampling temperature between 0 and 2. Higher values produce more random output'
        ),
      maxTokens: z.number().optional().describe('Maximum number of tokens to generate'),
      topP: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Nucleus sampling: consider tokens with top_p probability mass'),
      frequencyPenalty: z
        .number()
        .min(-2)
        .max(2)
        .optional()
        .describe('Penalize tokens based on their frequency in text so far'),
      presencePenalty: z
        .number()
        .min(-2)
        .max(2)
        .optional()
        .describe('Penalize tokens based on whether they appear in text so far'),
      stop: z
        .array(z.string())
        .optional()
        .describe('Stop sequences that will halt generation'),
      seed: z.number().optional().describe('Seed for reproducible generation'),
      jsonMode: z.boolean().optional().describe('Enable JSON mode for structured output'),
      webSearch: z
        .boolean()
        .optional()
        .describe('Enable web search to retrieve real-time information')
    })
  )
  .output(
    z.object({
      completionId: z.string().describe('Unique identifier for this completion'),
      model: z.string().describe('Model used for the completion'),
      content: z.string().describe('Generated text response'),
      finishReason: z.string().describe('Reason the generation stopped'),
      promptTokens: z.number().optional().describe('Number of tokens in the prompt'),
      completionTokens: z.number().optional().describe('Number of tokens in the completion'),
      totalTokens: z.number().optional().describe('Total tokens used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.chatCompletion({
      model: ctx.input.model,
      messages: ctx.input.messages,
      temperature: ctx.input.temperature,
      maxTokens: ctx.input.maxTokens,
      topP: ctx.input.topP,
      frequencyPenalty: ctx.input.frequencyPenalty,
      presencePenalty: ctx.input.presencePenalty,
      stop: ctx.input.stop,
      seed: ctx.input.seed,
      responseFormat: ctx.input.jsonMode ? { type: 'json_object' } : undefined,
      webSearch: ctx.input.webSearch
    });

    let choice = result.choices[0];

    return {
      output: {
        completionId: result.id,
        model: result.model,
        content: choice?.message?.content ?? '',
        finishReason: choice?.finish_reason ?? 'unknown',
        promptTokens: result.usage?.prompt_tokens,
        completionTokens: result.usage?.completion_tokens,
        totalTokens: result.usage?.total_tokens
      },
      message: `Generated completion using **${result.model}**. Response: ${(choice?.message?.content ?? '').substring(0, 200)}${(choice?.message?.content ?? '').length > 200 ? '...' : ''}`
    };
  })
  .build();
