import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeepSeekClient } from '../lib/client';
import { deepSeekServiceError } from '../lib/errors';
import { spec } from '../spec';

let modelSchema = z.enum(['deepseek-v4-flash', 'deepseek-v4-pro']);

let messageSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('system'),
    content: z.string().describe('System prompt content'),
    name: z.string().optional().describe('Optional participant name')
  }),
  z.object({
    role: z.literal('user'),
    content: z.string().describe('User message content'),
    name: z.string().optional().describe('Optional participant name')
  }),
  z.object({
    role: z.literal('assistant'),
    content: z.string().nullable().describe('Assistant message content'),
    name: z.string().optional().describe('Optional participant name'),
    reasoningContent: z
      .string()
      .optional()
      .describe('Previous reasoning content from the assistant for thinking-mode tool turns'),
    toolCalls: z
      .array(
        z.object({
          toolCallId: z.string().describe('Tool call ID'),
          functionName: z.string().describe('Name of the function called'),
          arguments: z.string().describe('JSON-encoded arguments')
        })
      )
      .optional()
      .describe('Tool calls made by the assistant')
  }),
  z.object({
    role: z.literal('tool'),
    content: z.string().describe('Tool response content'),
    toolCallId: z.string().describe('ID of the tool call this responds to')
  })
]);

let toolDefinitionSchema = z.object({
  functionName: z.string().describe('Name of the function'),
  description: z.string().optional().describe('Description of what the function does'),
  parameters: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('JSON Schema object describing the function parameters'),
  strict: z
    .boolean()
    .optional()
    .describe('Use DeepSeek beta strict-mode validation for this function definition')
});

let stopSchema = z
  .union([z.string(), z.array(z.string()).max(16)])
  .optional()
  .describe('Stop sequences that halt generation. Arrays are limited to 16 strings.');

let chatCompletionInputSchema = z.object({
  model: modelSchema.default('deepseek-v4-flash').describe('DeepSeek V4 model to use'),
  messages: z.array(messageSchema).min(1).describe('Conversation messages'),
  thinkingMode: z
    .enum(['disabled', 'enabled'])
    .default('disabled')
    .describe('Controls DeepSeek V4 thinking mode. Use enabled for reasoning tasks.'),
  reasoningEffort: z
    .enum(['high', 'max'])
    .optional()
    .describe('Reasoning effort when thinkingMode is enabled'),
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
  maxTokens: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Maximum number of tokens to generate'),
  stop: stopSchema,
  responseFormat: z
    .enum(['text', 'json_object'])
    .optional()
    .describe('Output format. Use json_object for strict JSON text responses.'),
  tools: z
    .array(toolDefinitionSchema)
    .max(128)
    .optional()
    .describe('Available function definitions the model may call'),
  toolChoice: z
    .union([
      z.enum(['none', 'auto', 'required']),
      z.object({
        functionName: z.string().describe('Force the model to call this specific function')
      })
    ])
    .optional()
    .describe('Controls tool invocation behavior'),
  strictToolCalls: z
    .boolean()
    .optional()
    .describe(
      'Use DeepSeek beta strict mode for tool calls. All outbound tool definitions are sent with strict=true.'
    ),
  logprobs: z
    .boolean()
    .optional()
    .describe('Whether to return log probabilities of output tokens'),
  topLogprobs: z
    .number()
    .int()
    .min(0)
    .max(20)
    .optional()
    .describe('Number of most likely tokens to return per position (0-20)'),
  userId: z
    .string()
    .max(512)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional()
    .describe(
      'Optional privacy-safe user identifier for safety, cache, and scheduling isolation'
    )
});

type ChatCompletionInput = z.infer<typeof chatCompletionInputSchema>;

let assertValidChatInput = (input: ChatCompletionInput) => {
  if (input.reasoningEffort && input.thinkingMode !== 'enabled') {
    throw deepSeekServiceError(
      'reasoningEffort can only be used when thinkingMode is enabled.'
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

  if (input.responseFormat === 'json_object') {
    let hasJsonInstruction = input.messages.some(
      message =>
        (message.role === 'system' || message.role === 'user') &&
        message.content.toLowerCase().includes('json')
    );

    if (!hasJsonInstruction) {
      throw deepSeekServiceError(
        'responseFormat=json_object requires a system or user message that explicitly asks for JSON.'
      );
    }
  }

  if (input.topLogprobs !== undefined && input.logprobs !== true) {
    throw deepSeekServiceError('topLogprobs requires logprobs=true.');
  }

  let hasStrictTool = input.tools?.some(tool => tool.strict === true) ?? false;
  let useStrictToolCalls = input.strictToolCalls === true || hasStrictTool;
  if (!useStrictToolCalls) return;

  if (!input.tools || input.tools.length === 0) {
    throw deepSeekServiceError('strictToolCalls requires at least one tool definition.');
  }

  if (hasStrictTool && !input.tools.every(tool => tool.strict === true)) {
    throw deepSeekServiceError(
      'DeepSeek strict tool-call mode requires every provided tool definition to set strict=true.'
    );
  }
};

let toApiMessages = (messages: ChatCompletionInput['messages']) =>
  messages.map(msg => {
    if (msg.role === 'assistant') {
      let assistantMsg: Record<string, unknown> = {
        role: 'assistant',
        content: msg.content
      };
      if (msg.name) assistantMsg.name = msg.name;
      if (msg.reasoningContent) assistantMsg.reasoning_content = msg.reasoningContent;
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        assistantMsg.tool_calls = msg.toolCalls.map(tc => ({
          id: tc.toolCallId,
          type: 'function' as const,
          function: {
            name: tc.functionName,
            arguments: tc.arguments
          }
        }));
      }
      return assistantMsg;
    }

    if (msg.role === 'tool') {
      return {
        role: 'tool' as const,
        content: msg.content,
        tool_call_id: msg.toolCallId
      };
    }

    return msg;
  });

export let chatCompletion = SlateTool.create(spec, {
  name: 'Chat Completion',
  key: 'chat_completion',
  description: `Generate a conversational response using DeepSeek V4 models. Supports non-thinking chat, thinking-mode reasoning, JSON output, and function/tool calling.`,
  instructions: [
    'Use `deepseek-v4-flash` for lower-latency and lower-cost chat, and `deepseek-v4-pro` for higher-capability reasoning or code tasks.',
    'Set `thinkingMode` to `enabled` for reasoning tasks and optionally set `reasoningEffort` to `high` or `max`.',
    'Set `responseFormat` to `json_object` only when the system or user message explicitly asks for JSON.',
    'When continuing a thinking-mode tool-call conversation, pass prior assistant `reasoningContent` back with the assistant message.'
  ],
  constraints: [
    'Current DeepSeek V4 models support a 1M token context length.',
    'Up to 128 tool definitions can be provided.',
    'Stop sequences are limited to 16.',
    '`temperature` and `topP` only apply when `thinkingMode` is disabled.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(chatCompletionInputSchema)
  .output(
    z.object({
      completionId: z.string().describe('Unique identifier for this completion'),
      model: z.string().describe('Model used for the completion'),
      content: z.string().nullable().describe('Generated text response'),
      reasoningContent: z
        .string()
        .nullable()
        .optional()
        .describe('Step-by-step reasoning content when thinking mode is enabled'),
      finishReason: z
        .string()
        .describe(
          'Reason generation stopped: stop, length, content_filter, tool_calls, or insufficient_system_resource'
        ),
      toolCalls: z
        .array(
          z.object({
            toolCallId: z.string().describe('Unique ID for this tool call'),
            functionName: z.string().describe('Name of the function to call'),
            arguments: z.string().describe('JSON-encoded function arguments')
          })
        )
        .optional()
        .describe('Tool calls requested by the model'),
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
    assertValidChatInput(ctx.input);

    let client = new DeepSeekClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let useStrictToolCalls =
      ctx.input.strictToolCalls === true ||
      (ctx.input.tools?.some(tool => tool.strict === true) ?? false);

    let apiTools = ctx.input.tools?.map(t => ({
      type: 'function' as const,
      function: {
        name: t.functionName,
        description: t.description,
        parameters: t.parameters,
        strict: useStrictToolCalls ? true : t.strict
      }
    }));

    let toolChoice: string | { type: 'function'; function: { name: string } } | undefined;
    if (ctx.input.toolChoice !== undefined) {
      if (typeof ctx.input.toolChoice === 'string') {
        toolChoice = ctx.input.toolChoice;
      } else {
        toolChoice = {
          type: 'function',
          function: { name: ctx.input.toolChoice.functionName }
        };
      }
    }

    let result = await client.createChatCompletion(
      {
        model: ctx.input.model,
        messages: toApiMessages(ctx.input.messages) as any,
        temperature: ctx.input.temperature,
        top_p: ctx.input.topP,
        max_tokens: ctx.input.maxTokens,
        stop: ctx.input.stop,
        response_format: ctx.input.responseFormat
          ? { type: ctx.input.responseFormat }
          : undefined,
        tools: apiTools,
        tool_choice: toolChoice,
        thinking: { type: ctx.input.thinkingMode },
        reasoning_effort: ctx.input.reasoningEffort,
        logprobs: ctx.input.logprobs,
        top_logprobs: ctx.input.topLogprobs,
        user_id: ctx.input.userId
      },
      { beta: useStrictToolCalls }
    );

    let choice = result.choices[0];
    if (!choice) {
      throw deepSeekServiceError(
        'DeepSeek chat completion response did not include a choice.'
      );
    }

    let outputToolCalls = choice.message.tool_calls?.map(tc => ({
      toolCallId: tc.id,
      functionName: tc.function.name,
      arguments: tc.function.arguments
    }));

    let output = {
      completionId: result.id,
      model: result.model,
      content: choice.message.content ?? null,
      reasoningContent: choice.message.reasoning_content ?? null,
      finishReason: choice.finish_reason,
      toolCalls: outputToolCalls,
      promptTokens: result.usage.prompt_tokens,
      completionTokens: result.usage.completion_tokens,
      totalTokens: result.usage.total_tokens,
      reasoningTokens: result.usage.completion_tokens_details?.reasoning_tokens,
      cacheHitTokens: result.usage.prompt_cache_hit_tokens,
      cacheMissTokens: result.usage.prompt_cache_miss_tokens
    };

    let messageParts: string[] = [];
    if (output.content) {
      let preview =
        output.content.length > 200
          ? `${output.content.substring(0, 200)}...`
          : output.content;
      messageParts.push(`**Response:** ${preview}`);
    }
    if (output.toolCalls && output.toolCalls.length > 0) {
      messageParts.push(
        `**Tool calls:** ${output.toolCalls.map(tc => `\`${tc.functionName}\``).join(', ')}`
      );
    }
    if (output.reasoningContent) {
      messageParts.push(
        `**Reasoning:** included (${output.reasoningTokens ?? 'unknown'} tokens)`
      );
    }
    messageParts.push(
      `**Usage:** ${output.totalTokens} total tokens (${output.promptTokens} prompt, ${output.completionTokens} completion)`
    );

    return {
      output,
      message: messageParts.join('\n')
    };
  })
  .build();
