import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let messageSchema = z.object({
  role: z
    .enum(['system', 'user', 'assistant', 'tool'])
    .describe('The role of the message sender'),
  content: z
    .union([z.string(), z.array(z.record(z.string(), z.unknown()))])
    .describe(
      'Message content — a string for text, or an array of content parts for multimodal input (images, PDFs)'
    ),
  name: z.string().optional().describe('Optional name for the message sender'),
  toolCallId: z
    .string()
    .optional()
    .describe('Required for tool role — the ID of the tool call this message responds to'),
  toolCalls: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe('Tool calls made by the assistant')
});

let toolDefinitionSchema = z.object({
  type: z.literal('function').describe('Tool type, currently only "function" is supported'),
  function: z.object({
    name: z.string().describe('The name of the function'),
    description: z.string().optional().describe('Description of what the function does'),
    parameters: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('JSON Schema describing the function parameters')
  })
});

let providerPreferencesSchema = z
  .object({
    order: z.array(z.string()).optional().describe('Ordered list of provider names to prefer'),
    only: z.array(z.string()).optional().describe('Only route to these provider names'),
    ignore: z.array(z.string()).optional().describe('Do not route to these provider names'),
    allow_fallbacks: z
      .boolean()
      .optional()
      .describe('Whether to allow fallback to other providers'),
    require_parameters: z
      .boolean()
      .optional()
      .describe('Require all providers to support all parameters'),
    quantizations: z
      .array(z.string())
      .optional()
      .describe('Allowed quantizations (e.g. "fp16", "int8")'),
    data_collection: z
      .enum(['allow', 'deny'])
      .optional()
      .describe('Data collection policy for providers'),
    sort: z
      .enum(['price', 'throughput', 'latency'])
      .optional()
      .describe('Provider sorting preference'),
    zdr: z.boolean().optional().describe('Require zero data retention providers')
  })
  .describe('Provider routing preferences');

let responseFormatSchema = z
  .object({
    type: z.enum(['json_object', 'json_schema', 'text']).describe('Response format type'),
    json_schema: z
      .object({
        name: z.string().describe('Schema name'),
        strict: z.boolean().optional().describe('Whether to enforce strict schema compliance'),
        schema: z.record(z.string(), z.unknown()).describe('The JSON Schema to enforce')
      })
      .optional()
      .describe('JSON schema definition (required when type is json_schema)')
  })
  .describe('Structured output format configuration');

let pluginSchema = z
  .object({
    id: z
      .string()
      .describe(
        'Plugin ID (e.g., "web", "file-parser", "response-healing", "context-compression")'
      ),
    enabled: z.boolean().optional().describe('Whether this plugin is enabled'),
    config: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Plugin-specific configuration')
  })
  .describe('Plugin to enable for this request');

let reasoningSchema = z
  .object({
    effort: z
      .enum(['none', 'minimal', 'low', 'medium', 'high', 'xhigh'])
      .optional()
      .describe('Reasoning effort for models that support extended thinking'),
    max_tokens: z.number().optional().describe('Maximum reasoning tokens')
  })
  .describe('Reasoning configuration');

export let sendChatCompletion = SlateTool.create(spec, {
  name: 'Send Chat Completion',
  key: 'send_chat_completion',
  description: `Send messages to any of 400+ AI models through OpenRouter's unified API. Supports text, images, and PDFs as input. Configurable parameters include temperature, max tokens, tool calling, structured outputs, and provider routing. Use model variants like \`:nitro\` for speed, \`:floor\` for cost, or \`:free\` for free access.`,
  instructions: [
    'The model field accepts model IDs like "openai/gpt-4o", "anthropic/claude-3.5-sonnet", "google/gemini-pro", etc.',
    'Append ":nitro" to a model ID for faster throughput, ":floor" for cheapest price, ":free" for free tier.',
    'Use the "models" field to specify fallback models if the primary model fails.'
  ],
  constraints: [
    'Streaming is not supported through this tool — responses are returned in full.',
    'Max tokens and context limits vary per model.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe(
          'Model ID to use (e.g., "openai/gpt-4o", "anthropic/claude-3.5-sonnet"). Append ":nitro", ":floor", ":free", or ":exacto" for routing variants.'
        ),
      messages: z.array(messageSchema).describe('Array of messages forming the conversation'),
      temperature: z
        .number()
        .min(0)
        .max(2)
        .optional()
        .describe('Sampling temperature (0-2). Higher values make output more random.'),
      maxTokens: z
        .number()
        .optional()
        .describe('Deprecated OpenRouter max_tokens field; prefer maxCompletionTokens'),
      maxCompletionTokens: z
        .number()
        .optional()
        .describe('Maximum number of tokens to generate in the completion'),
      topP: z.number().min(0).max(1).optional().describe('Nucleus sampling threshold (0-1)'),
      topK: z
        .number()
        .optional()
        .describe('Top-K sampling: limits token selection to K most likely tokens'),
      topA: z.number().optional().describe('Top-A sampling threshold for supported providers'),
      minP: z
        .number()
        .optional()
        .describe('Minimum probability threshold for supported providers'),
      frequencyPenalty: z
        .number()
        .optional()
        .describe('Penalty for token frequency (-2 to 2)'),
      presencePenalty: z.number().optional().describe('Penalty for token presence (-2 to 2)'),
      repetitionPenalty: z.number().optional().describe('Repetition penalty (0 to 2)'),
      stop: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Stop sequence(s) to end generation'),
      seed: z.number().optional().describe('Random seed for deterministic generation'),
      tools: z
        .array(toolDefinitionSchema)
        .optional()
        .describe('Tools (functions) the model may call'),
      toolChoice: z
        .union([
          z.enum(['auto', 'none', 'required']),
          z.object({ type: z.literal('function'), function: z.object({ name: z.string() }) })
        ])
        .optional()
        .describe(
          'Controls tool selection: "auto", "none", "required", or force a specific function'
        ),
      parallelToolCalls: z
        .boolean()
        .optional()
        .describe('Whether the model may produce multiple tool calls in one response'),
      responseFormat: responseFormatSchema
        .optional()
        .describe('Enforce structured JSON output'),
      models: z
        .array(z.string())
        .optional()
        .describe('Fallback model list — if the primary model fails, try these in order'),
      route: z
        .enum(['fallback'])
        .optional()
        .describe('Set to "fallback" to enable model fallback routing'),
      provider: providerPreferencesSchema.optional().describe('Provider routing preferences'),
      transforms: z
        .array(z.string())
        .optional()
        .describe('Legacy request transforms; prefer the context-compression plugin'),
      plugins: z
        .array(pluginSchema)
        .optional()
        .describe('Plugins to enable (e.g., web search, PDF processing)'),
      reasoning: reasoningSchema.optional().describe('Reasoning model configuration'),
      reasoningEffort: z
        .enum(['none', 'minimal', 'low', 'medium', 'high', 'xhigh'])
        .optional()
        .describe('Shorthand for reasoning.effort'),
      modalities: z
        .array(z.enum(['text', 'image', 'audio']))
        .optional()
        .describe('Requested output modalities for supported models'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Metadata for the request, up to 16 key-value pairs'),
      serviceTier: z.string().optional().describe('Service tier to use for routing'),
      sessionId: z
        .string()
        .optional()
        .describe('Stable session identifier for provider stickiness and observability'),
      trace: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Observability trace metadata'),
      user: z
        .string()
        .optional()
        .describe('Stable end-user identifier used to help detect and prevent abuse'),
      logprobs: z.boolean().optional().describe('Return token log probabilities'),
      topLogprobs: z
        .number()
        .optional()
        .describe('Number of top log probabilities to return, when supported')
    })
  )
  .output(
    z.object({
      generationId: z
        .string()
        .optional()
        .describe('Unique ID for this generation, usable with the generation stats endpoint'),
      model: z.string().optional().describe('The model that actually served the request'),
      choices: z
        .array(
          z.object({
            index: z.number().describe('Choice index'),
            message: z
              .object({
                role: z.string().describe('Message role'),
                content: z
                  .string()
                  .nullable()
                  .optional()
                  .describe('Text content of the response'),
                toolCalls: z
                  .array(
                    z.object({
                      callId: z.string().describe('Tool call ID'),
                      type: z.string().describe('Tool call type'),
                      function: z.object({
                        name: z.string().describe('Function name'),
                        arguments: z.string().describe('Function arguments as JSON string')
                      })
                    })
                  )
                  .optional()
                  .describe('Tool calls requested by the model')
              })
              .describe('The assistant message'),
            finishReason: z
              .string()
              .nullable()
              .optional()
              .describe('Why the model stopped generating (stop, length, tool_calls, etc.)')
          })
        )
        .describe('Array of completion choices'),
      usage: z
        .object({
          promptTokens: z.number().describe('Tokens in the prompt'),
          completionTokens: z.number().describe('Tokens in the completion'),
          totalTokens: z.number().describe('Total tokens used')
        })
        .optional()
        .describe('Token usage statistics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      siteUrl: ctx.config.siteUrl,
      appTitle: ctx.config.appTitle
    });

    let request: {
      model: string;
      messages: Array<{
        role: string;
        content: string | Record<string, unknown>[];
        name?: string;
        toolCallId?: string;
        toolCalls?: Record<string, unknown>[];
      }>;
      temperature?: number;
      maxTokens?: number;
      maxCompletionTokens?: number;
      topP?: number;
      topK?: number;
      topA?: number;
      minP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      repetitionPenalty?: number;
      stop?: string | string[];
      seed?: number;
      tools?: Record<string, unknown>[];
      toolChoice?: string | Record<string, unknown>;
      parallelToolCalls?: boolean;
      responseFormat?: Record<string, unknown>;
      models?: string[];
      route?: string;
      provider?: Record<string, unknown>;
      transforms?: string[];
      plugins?: Record<string, unknown>[];
      reasoning?: Record<string, unknown>;
      reasoningEffort?: string;
      modalities?: string[];
      metadata?: Record<string, string>;
      serviceTier?: string;
      sessionId?: string;
      trace?: Record<string, unknown>;
      user?: string;
      logprobs?: boolean;
      topLogprobs?: number;
    } = {
      model: ctx.input.model,
      messages: ctx.input.messages.map(m => ({
        role: m.role,
        content: m.content ?? '',
        ...(m.name !== undefined ? { name: m.name } : {}),
        ...(m.toolCallId !== undefined ? { toolCallId: m.toolCallId } : {}),
        ...(m.toolCalls !== undefined ? { toolCalls: m.toolCalls } : {})
      })),
      ...(ctx.input.temperature !== undefined ? { temperature: ctx.input.temperature } : {}),
      ...(ctx.input.maxTokens !== undefined ? { maxTokens: ctx.input.maxTokens } : {}),
      ...(ctx.input.maxCompletionTokens !== undefined
        ? { maxCompletionTokens: ctx.input.maxCompletionTokens }
        : {}),
      ...(ctx.input.topP !== undefined ? { topP: ctx.input.topP } : {}),
      ...(ctx.input.topK !== undefined ? { topK: ctx.input.topK } : {}),
      ...(ctx.input.topA !== undefined ? { topA: ctx.input.topA } : {}),
      ...(ctx.input.minP !== undefined ? { minP: ctx.input.minP } : {}),
      ...(ctx.input.frequencyPenalty !== undefined
        ? { frequencyPenalty: ctx.input.frequencyPenalty }
        : {}),
      ...(ctx.input.presencePenalty !== undefined
        ? { presencePenalty: ctx.input.presencePenalty }
        : {}),
      ...(ctx.input.repetitionPenalty !== undefined
        ? { repetitionPenalty: ctx.input.repetitionPenalty }
        : {}),
      ...(ctx.input.stop !== undefined ? { stop: ctx.input.stop } : {}),
      ...(ctx.input.seed !== undefined ? { seed: ctx.input.seed } : {}),
      ...(ctx.input.tools !== undefined ? { tools: ctx.input.tools } : {}),
      ...(ctx.input.toolChoice !== undefined ? { toolChoice: ctx.input.toolChoice } : {}),
      ...(ctx.input.parallelToolCalls !== undefined
        ? { parallelToolCalls: ctx.input.parallelToolCalls }
        : {}),
      ...(ctx.input.responseFormat !== undefined
        ? { responseFormat: ctx.input.responseFormat }
        : {}),
      ...(ctx.input.models !== undefined ? { models: ctx.input.models } : {}),
      ...(ctx.input.route !== undefined ? { route: ctx.input.route } : {}),
      ...(ctx.input.provider !== undefined ? { provider: ctx.input.provider } : {}),
      ...(ctx.input.transforms !== undefined ? { transforms: ctx.input.transforms } : {}),
      ...(ctx.input.plugins !== undefined ? { plugins: ctx.input.plugins } : {}),
      ...(ctx.input.reasoning !== undefined ? { reasoning: ctx.input.reasoning } : {}),
      ...(ctx.input.reasoningEffort !== undefined
        ? { reasoningEffort: ctx.input.reasoningEffort }
        : {}),
      ...(ctx.input.modalities !== undefined ? { modalities: ctx.input.modalities } : {}),
      ...(ctx.input.metadata !== undefined ? { metadata: ctx.input.metadata } : {}),
      ...(ctx.input.serviceTier !== undefined ? { serviceTier: ctx.input.serviceTier } : {}),
      ...(ctx.input.sessionId !== undefined ? { sessionId: ctx.input.sessionId } : {}),
      ...(ctx.input.trace !== undefined ? { trace: ctx.input.trace } : {}),
      ...(ctx.input.user !== undefined ? { user: ctx.input.user } : {}),
      ...(ctx.input.logprobs !== undefined ? { logprobs: ctx.input.logprobs } : {}),
      ...(ctx.input.topLogprobs !== undefined ? { topLogprobs: ctx.input.topLogprobs } : {})
    };

    let result = await client.createChatCompletion(request);

    let choices = ((result.choices as Record<string, unknown>[]) || []).map(
      (choice: Record<string, unknown>) => {
        let message = (choice.message as Record<string, unknown>) || {};
        let toolCalls = ((message.tool_calls as Record<string, unknown>[]) || []).map(
          (tc: Record<string, unknown>) => {
            let fn = (tc.function as Record<string, unknown>) || {};
            return {
              callId: (tc.id as string) || '',
              type: (tc.type as string) || 'function',
              function: {
                name: (fn.name as string) || '',
                arguments: (fn.arguments as string) || ''
              }
            };
          }
        );

        return {
          index: (choice.index as number) || 0,
          message: {
            role: (message.role as string) || 'assistant',
            content: (message.content as string | null) ?? null,
            ...(toolCalls.length > 0 ? { toolCalls } : {})
          },
          finishReason: (choice.finish_reason as string | null) ?? null
        };
      }
    );

    let usage = result.usage as Record<string, unknown> | undefined;

    let output = {
      generationId: (result.id as string) || undefined,
      model: (result.model as string) || undefined,
      choices,
      ...(usage
        ? {
            usage: {
              promptTokens: (usage.prompt_tokens as number) || 0,
              completionTokens: (usage.completion_tokens as number) || 0,
              totalTokens: (usage.total_tokens as number) || 0
            }
          }
        : {})
    };

    let firstContent = choices[0]?.message?.content;
    let summary = firstContent
      ? `Model **${output.model}** responded with ${choices.length} choice(s). ${output.usage ? `Used ${output.usage.totalTokens} tokens.` : ''}`
      : `Model **${output.model}** responded with tool calls.`;

    return {
      output,
      message: summary
    };
  })
  .build();
