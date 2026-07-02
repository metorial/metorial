import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeepSeekClient } from '../lib/client';
import { spec } from '../spec';

export let fimCompletion = SlateTool.create(spec, {
  name: 'FIM Completion',
  key: 'fim_completion',
  description: `Fill In the Middle (FIM) completion for code and content. Provide a prefix and optional suffix, and the model generates the content that belongs in between.
Commonly used for code completion, inserting missing code segments, and content gap-filling.`,
  instructions: [
    'Provide the code or text before the insertion point as `prefix`, and optionally the code after the insertion point as `suffix`.',
    'This is a Beta feature that always uses the Beta API endpoint regardless of the configured base URL.'
  ],
  constraints: [
    'Not available in thinking/reasoning mode.',
    'Stop sequences are limited to 16.'
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
        .default('deepseek-chat')
        .describe('Model to use. Defaults to deepseek-chat.'),
      prefix: z
        .string()
        .describe('Text/code before the point where completion should be inserted'),
      suffix: z
        .string()
        .optional()
        .describe('Text/code after the point where completion should be inserted'),
      maxTokens: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum number of tokens to generate'),
      temperature: z.number().min(0).max(2).optional().describe('Sampling temperature (0-2)'),
      topP: z.number().min(0).max(1).optional().describe('Nucleus sampling parameter (0-1)'),
      frequencyPenalty: z
        .number()
        .min(-2)
        .max(2)
        .optional()
        .describe('Penalizes repeated tokens (-2 to 2)'),
      presencePenalty: z
        .number()
        .min(-2)
        .max(2)
        .optional()
        .describe('Encourages new topics (-2 to 2)'),
      stop: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Stop sequences that halt generation'),
      echo: z
        .boolean()
        .optional()
        .describe('Whether to echo the prompt alongside the completion')
    })
  )
  .output(
    z.object({
      completionId: z.string().describe('Unique identifier for this completion'),
      model: z.string().describe('Model used'),
      generatedText: z
        .string()
        .describe('The generated text inserted between prefix and suffix'),
      finishReason: z.string().describe('Reason generation stopped'),
      promptTokens: z.number().describe('Number of tokens in the prompt'),
      completionTokens: z.number().describe('Number of tokens in the completion'),
      totalTokens: z.number().describe('Total tokens used'),
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
    let client = new DeepSeekClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.createFimCompletion({
      model: ctx.input.model,
      prompt: ctx.input.prefix,
      suffix: ctx.input.suffix,
      max_tokens: ctx.input.maxTokens,
      temperature: ctx.input.temperature,
      top_p: ctx.input.topP,
      frequency_penalty: ctx.input.frequencyPenalty,
      presence_penalty: ctx.input.presencePenalty,
      stop: ctx.input.stop,
      echo: ctx.input.echo
    });

    let choice = result.choices[0]!;

    let output = {
      completionId: result.id,
      model: result.model,
      generatedText: choice.text,
      finishReason: choice.finish_reason,
      promptTokens: result.usage.prompt_tokens,
      completionTokens: result.usage.completion_tokens,
      totalTokens: result.usage.total_tokens,
      cacheHitTokens: result.usage.prompt_cache_hit_tokens,
      cacheMissTokens: result.usage.prompt_cache_miss_tokens
    };

    let preview =
      output.generatedText.length > 200
        ? `${output.generatedText.substring(0, 200)}...`
        : output.generatedText;

    return {
      output,
      message: `**Generated text:** ${preview}\n**Usage:** ${output.totalTokens} total tokens (${output.promptTokens} prompt, ${output.completionTokens} completion)`
    };
  })
  .build();
