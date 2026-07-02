import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeepSeekClient } from '../lib/client';
import { spec } from '../spec';

let messageSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('system'),
    content: z.string().describe('System prompt content')
  }),
  z.object({
    role: z.literal('user'),
    content: z.string().describe('User message content')
  }),
  z.object({
    role: z.literal('assistant'),
    content: z.string().nullable().describe('Assistant message content'),
    reasoningContent: z
      .string()
      .optional()
      .describe('Previous reasoning content from the assistant (for multi-turn reasoning)'),
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
    .describe('JSON Schema describing the function parameters')
});

export let chatCompletion = SlateTool.create(spec, {
  name: 'Chat Completion',
  key: 'chat_completion',
  description: `Generate a conversational response using DeepSeek's language models. Supports general-purpose chat (\`deepseek-chat\`) and chain-of-thought reasoning (\`deepseek-reasoner\`).
Enables function calling with tool definitions, structured JSON output via response format, and thinking mode for step-by-step reasoning.`,
  instructions: [
    'Use `deepseek-chat` for general-purpose conversations and `deepseek-reasoner` for tasks requiring step-by-step reasoning.',
    'When using `deepseek-reasoner` or enabling thinking, `temperature`, `topP`, `frequencyPenalty`, `presencePenalty`, and `logprobs` are not supported.',
    'Set `responseFormat` to `json_object` to receive structured JSON output. Ensure the system or user message instructs the model to produce JSON.',
    'For multi-turn conversations with reasoning, pass the previous `reasoningContent` back in the assistant message.'
  ],
  constraints: [
    'Maximum context length is 128K tokens.',
    'Up to 128 tool definitions can be provided.',
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
        .enum(['deepseek-chat', 'deepseek-reasoner'])
        .default('deepseek-chat')
        .describe('Model to use for the completion'),
      messages: z.array(messageSchema).min(1).describe('Conversation messages'),
      temperature: z
        .number()
        .min(0)
        .max(2)
        .optional()
        .describe('Sampling temperature (0-2). Higher values produce more random output.'),
      topP: z.number().min(0).max(1).optional().describe('Nucleus sampling parameter (0-1)'),
      maxTokens: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum number of tokens to generate'),
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
      responseFormat: z
        .enum(['text', 'json_object'])
        .optional()
        .describe('Output format. Use json_object for structured JSON responses.'),
      tools: z
        .array(toolDefinitionSchema)
        .optional()
        .describe('Available tool/function definitions the model may call'),
      toolChoice: z
        .union([
          z.enum(['none', 'auto', 'required']),
          z.object({
            functionName: z.string().describe('Force the model to call this specific function')
          })
        ])
        .optional()
        .describe('Controls tool invocation behavior'),
      enableThinking: z
        .boolean()
        .optional()
        .describe(
          'Enable thinking/reasoning mode on deepseek-chat. Automatically enabled for deepseek-reasoner.'
        ),
      thinkingBudgetTokens: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum tokens for the thinking/reasoning process'),
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
        .describe('Number of most likely tokens to return per position (0-20)')
    })
  )
  .output(
    z.object({
      completionId: z.string().describe('Unique identifier for this completion'),
      model: z.string().describe('Model used for the completion'),
      content: z.string().nullable().describe('Generated text response'),
      reasoningContent: z
        .string()
        .nullable()
        .optional()
        .describe('Step-by-step reasoning content (when using thinking mode)'),
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
    let client = new DeepSeekClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let apiMessages = ctx.input.messages.map(msg => {
      if (msg.role === 'assistant') {
        let assistantMsg: Record<string, unknown> = {
          role: 'assistant',
          content: msg.content
        };
        if (msg.reasoningContent) {
          assistantMsg.reasoning_content = msg.reasoningContent;
        }
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

    let apiTools = ctx.input.tools?.map(t => ({
      type: 'function' as const,
      function: {
        name: t.functionName,
        description: t.description,
        parameters: t.parameters
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

    let thinking: { type: 'enabled' | 'disabled'; budget_tokens?: number } | undefined;
    if (ctx.input.model === 'deepseek-reasoner' || ctx.input.enableThinking) {
      thinking = { type: 'enabled' };
      if (ctx.input.thinkingBudgetTokens) {
        thinking.budget_tokens = ctx.input.thinkingBudgetTokens;
      }
    }

    let result = await client.createChatCompletion({
      model: ctx.input.model,
      messages: apiMessages as any,
      temperature: ctx.input.temperature,
      top_p: ctx.input.topP,
      max_tokens: ctx.input.maxTokens,
      frequency_penalty: ctx.input.frequencyPenalty,
      presence_penalty: ctx.input.presencePenalty,
      stop: ctx.input.stop,
      response_format: ctx.input.responseFormat
        ? { type: ctx.input.responseFormat }
        : undefined,
      tools: apiTools,
      tool_choice: toolChoice,
      thinking,
      logprobs: ctx.input.logprobs,
      top_logprobs: ctx.input.topLogprobs
    });

    let choice = result.choices[0]!;

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
