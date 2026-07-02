import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeepSeekClient } from '../lib/client';
import { deepSeekServiceError } from '../lib/errors';
import { spec } from '../spec';

let chatPrefixInputSchema = z.object({
  model: z
    .enum(['deepseek-v4-flash', 'deepseek-v4-pro'])
    .default('deepseek-v4-pro')
    .describe('DeepSeek V4 model to use for beta chat prefix completion'),
  prompt: z.string().describe('User instruction or prompt before the assistant prefix'),
  assistantPrefix: z
    .string()
    .min(1)
    .describe('Assistant message prefix that the model should continue from'),
  systemPrompt: z.string().optional().describe('Optional system prompt for the request'),
  thinkingMode: z
    .enum(['disabled', 'enabled'])
    .default('disabled')
    .describe('Controls DeepSeek V4 thinking mode for this prefix completion'),
  reasoningEffort: z
    .enum(['high', 'max'])
    .optional()
    .describe('Reasoning effort when thinkingMode is enabled'),
  reasoningPrefix: z
    .string()
    .optional()
    .describe('Optional reasoning_content prefix for thinking-mode beta prefix completion'),
  maxTokens: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Maximum number of tokens to generate'),
  temperature: z
    .number()
    .min(0)
    .max(2)
    .optional()
    .describe('Sampling temperature (0-2). Only applies when thinkingMode is disabled.'),
  topP: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Nucleus sampling parameter (0-1). Only applies when thinkingMode is disabled.'),
  stop: z
    .union([z.string(), z.array(z.string()).max(16)])
    .optional()
    .describe('Stop sequences that halt generation. Arrays are limited to 16 strings.'),
  userId: z
    .string()
    .max(512)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional()
    .describe(
      'Optional privacy-safe user identifier for safety, cache, and scheduling isolation'
    )
});

type ChatPrefixInput = z.infer<typeof chatPrefixInputSchema>;

let assertValidChatPrefixInput = (input: ChatPrefixInput) => {
  if (input.reasoningEffort && input.thinkingMode !== 'enabled') {
    throw deepSeekServiceError(
      'reasoningEffort can only be used when thinkingMode is enabled.'
    );
  }

  if (input.reasoningPrefix && input.thinkingMode !== 'enabled') {
    throw deepSeekServiceError(
      'reasoningPrefix can only be used when thinkingMode is enabled.'
    );
  }

  if (
    input.thinkingMode === 'enabled' &&
    (input.temperature !== undefined || input.topP !== undefined)
  ) {
    throw deepSeekServiceError(
      'temperature and topP are only supported when thinkingMode is disabled.'
    );
  }
};

export let chatPrefixCompletion = SlateTool.create(spec, {
  name: 'Chat Prefix Completion',
  key: 'chat_prefix_completion',
  description:
    'Continue from a supplied assistant prefix using DeepSeek beta chat prefix completion. Useful for forcing an answer to start with a code fence, template, or partial response.',
  instructions: [
    'Use `assistantPrefix` for the exact assistant text the model should continue from.',
    'This beta feature always uses `https://api.deepseek.com/beta` regardless of the configured base URL.',
    'Set `stop` when using code fences or templates to prevent trailing explanations.'
  ],
  constraints: [
    'The last API message is always an assistant message with `prefix=true`.',
    'Stop sequences are limited to 16.',
    '`temperature` and `topP` only apply when `thinkingMode` is disabled.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(chatPrefixInputSchema)
  .output(
    z.object({
      completionId: z.string().describe('Unique identifier for this completion'),
      model: z.string().describe('Model used for the completion'),
      completedText: z.string().nullable().describe('Text generated after the prefix'),
      fullText: z
        .string()
        .nullable()
        .describe('Assistant prefix plus the generated continuation when available'),
      reasoningContent: z
        .string()
        .nullable()
        .optional()
        .describe('Step-by-step reasoning content when thinking mode is enabled'),
      finishReason: z.string().describe('Reason generation stopped'),
      promptTokens: z.number().describe('Number of tokens in the prompt'),
      completionTokens: z.number().describe('Number of tokens in the completion'),
      totalTokens: z.number().describe('Total tokens used'),
      reasoningTokens: z.number().optional().describe('Number of tokens used for reasoning'),
      cacheHitTokens: z
        .number()
        .optional()
        .describe('Number of prompt tokens served from cache'),
      cacheMissTokens: z
        .number()
        .optional()
        .describe('Number of prompt tokens not found in cache')
    })
  )
  .handleInvocation(async ctx => {
    assertValidChatPrefixInput(ctx.input);

    let client = new DeepSeekClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let messages: Record<string, unknown>[] = [];
    if (ctx.input.systemPrompt) {
      messages.push({ role: 'system', content: ctx.input.systemPrompt });
    }
    messages.push({ role: 'user', content: ctx.input.prompt });

    let assistantMessage: Record<string, unknown> = {
      role: 'assistant',
      content: ctx.input.assistantPrefix,
      prefix: true
    };
    if (ctx.input.reasoningPrefix) {
      assistantMessage.reasoning_content = ctx.input.reasoningPrefix;
    }
    messages.push(assistantMessage);

    let result = await client.createChatCompletion(
      {
        model: ctx.input.model,
        messages: messages as any,
        thinking: { type: ctx.input.thinkingMode },
        reasoning_effort: ctx.input.reasoningEffort,
        max_tokens: ctx.input.maxTokens,
        temperature: ctx.input.temperature,
        top_p: ctx.input.topP,
        stop: ctx.input.stop,
        user_id: ctx.input.userId
      },
      { beta: true }
    );

    let choice = result.choices[0];
    if (!choice) {
      throw deepSeekServiceError(
        'DeepSeek chat prefix completion response did not include a choice.'
      );
    }

    let completedText = choice.message.content ?? null;
    let output = {
      completionId: result.id,
      model: result.model,
      completedText,
      fullText: completedText === null ? null : `${ctx.input.assistantPrefix}${completedText}`,
      reasoningContent: choice.message.reasoning_content ?? null,
      finishReason: choice.finish_reason,
      promptTokens: result.usage.prompt_tokens,
      completionTokens: result.usage.completion_tokens,
      totalTokens: result.usage.total_tokens,
      reasoningTokens: result.usage.completion_tokens_details?.reasoning_tokens,
      cacheHitTokens: result.usage.prompt_cache_hit_tokens,
      cacheMissTokens: result.usage.prompt_cache_miss_tokens
    };

    let preview = output.fullText
      ? output.fullText.length > 200
        ? `${output.fullText.substring(0, 200)}...`
        : output.fullText
      : '(empty response)';

    return {
      output,
      message: `**Completion:** ${preview}\n**Usage:** ${output.totalTokens} total tokens (${output.promptTokens} prompt, ${output.completionTokens} completion)`
    };
  })
  .build();
