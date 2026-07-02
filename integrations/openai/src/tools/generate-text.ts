import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { openAIServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let messageSchema = z.object({
  role: z
    .enum(['system', 'user', 'assistant', 'developer'])
    .describe('Role of the message sender'),
  content: z.string().describe('Content of the message'),
  name: z.string().optional().describe('Optional name for the message sender')
});

let buildChatResponseFormat = (responseFormatType?: string, jsonSchema?: any) => {
  if (!responseFormatType) {
    return undefined;
  }

  if (responseFormatType !== 'json_schema') {
    return { type: responseFormatType };
  }

  if (!jsonSchema) {
    throw openAIServiceError(
      'jsonSchema is required when responseFormatType is "json_schema".'
    );
  }

  let hasFullConfig =
    typeof jsonSchema === 'object' &&
    jsonSchema !== null &&
    typeof jsonSchema.name === 'string' &&
    jsonSchema.schema !== undefined;

  return {
    type: 'json_schema',
    json_schema: hasFullConfig
      ? jsonSchema
      : {
          name: 'response_schema',
          schema: jsonSchema,
          strict: true
        }
  };
};

export let generateText = SlateTool.create(spec, {
  name: 'Generate Text',
  key: 'generate_text',
  description: `Generate text using OpenAI chat completion models (GPT-5, GPT-4o, etc.). Supports multi-turn conversations, system instructions, structured JSON output, and configurable generation parameters.`,
  instructions: [
    'Provide messages as an array with role and content. Use "system" or "developer" role for instructions.',
    'Set responseFormatType to "json_schema" and provide jsonSchema for structured output.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      model: z.string().describe('Model ID to use (e.g. "gpt-4o", "gpt-4o-mini", "gpt-5")'),
      messages: z.array(messageSchema).describe('Array of messages forming the conversation'),
      temperature: z
        .number()
        .min(0)
        .max(2)
        .optional()
        .describe(
          'Sampling temperature between 0 and 2. Lower values are more deterministic.'
        ),
      maxTokens: z.number().optional().describe('Maximum number of tokens to generate'),
      topP: z.number().min(0).max(1).optional().describe('Nucleus sampling parameter'),
      frequencyPenalty: z
        .number()
        .min(-2)
        .max(2)
        .optional()
        .describe('Penalize repeated tokens based on frequency'),
      presencePenalty: z
        .number()
        .min(-2)
        .max(2)
        .optional()
        .describe('Penalize tokens that have already appeared'),
      stop: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Stop sequences to halt generation'),
      responseFormatType: z
        .enum(['text', 'json_object', 'json_schema'])
        .optional()
        .describe('Format of the response'),
      jsonSchema: z
        .any()
        .optional()
        .describe(
          'JSON Schema for structured output when responseFormatType is "json_schema"'
        ),
      seed: z.number().optional().describe('Seed for deterministic generation'),
      user: z.string().optional().describe('Unique identifier for the end-user')
    })
  )
  .output(
    z.object({
      completionId: z.string().describe('Unique identifier for this completion'),
      content: z.string().nullable().describe('Generated text content'),
      finishReason: z
        .string()
        .nullable()
        .describe('Why generation stopped (e.g. "stop", "length", "tool_calls")'),
      model: z.string().describe('Model used for generation'),
      promptTokens: z.number().describe('Number of tokens in the prompt'),
      completionTokens: z.number().describe('Number of tokens in the completion'),
      totalTokens: z.number().describe('Total tokens used')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let responseFormat = buildChatResponseFormat(
      ctx.input.responseFormatType,
      ctx.input.jsonSchema
    );

    let result = await client.createChatCompletion({
      model: ctx.input.model,
      messages: ctx.input.messages,
      temperature: ctx.input.temperature,
      maxCompletionTokens: ctx.input.maxTokens,
      topP: ctx.input.topP,
      frequencyPenalty: ctx.input.frequencyPenalty,
      presencePenalty: ctx.input.presencePenalty,
      stop: ctx.input.stop,
      responseFormat,
      seed: ctx.input.seed,
      user: ctx.input.user
    });

    let choice = result.choices?.[0];
    let content = choice?.message?.content ?? null;

    return {
      output: {
        completionId: result.id,
        content,
        finishReason: choice?.finish_reason ?? null,
        model: result.model,
        promptTokens: result.usage?.prompt_tokens ?? 0,
        completionTokens: result.usage?.completion_tokens ?? 0,
        totalTokens: result.usage?.total_tokens ?? 0
      },
      message: `Generated text using **${result.model}**. Used ${result.usage?.total_tokens ?? 0} tokens. Finish reason: ${choice?.finish_reason ?? 'unknown'}.`
    };
  })
  .build();
