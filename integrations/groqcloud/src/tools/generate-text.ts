import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']).describe('Role of the message sender'),
  content: z.string().describe('Content of the message'),
  name: z.string().optional().describe('Optional name for the message sender'),
  toolCallId: z.string().optional().describe('Tool call ID when role is "tool"')
});

let toolDefinitionSchema = z.object({
  type: z.literal('function').describe('Type of tool, always "function"'),
  function: z.object({
    name: z.string().describe('Name of the function'),
    description: z.string().optional().describe('Description of what the function does'),
    parameters: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('JSON Schema of the function parameters')
  })
});

export let generateText = SlateTool.create(spec, {
  name: 'Generate Text',
  key: 'generate_text',
  description: `Generate text using Groq's chat completions API with ultra-low latency inference. Supports conversational interactions, content generation, structured outputs, tool/function calling, and reasoning models. Pass a series of messages and receive a model-generated response.`,
  instructions: [
    'Provide messages as an array with role and content. System messages set behavior, user messages contain prompts, assistant messages provide context from prior turns.',
    'For structured JSON output, set responseFormat with type "json_schema" or "json_object".',
    'For tool/function calling, provide tool definitions and optionally set toolChoice to control tool usage.',
    'For reasoning models (e.g. DeepSeek R1, Qwen3, GPT-OSS), use reasoningFormat and reasoningEffort to control chain-of-thought behavior.'
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
          'Model ID to use (e.g., "llama-3.3-70b-versatile", "deepseek-r1-distill-llama-70b", "meta-llama/llama-4-scout-17b-16e-instruct")'
        ),
      messages: z.array(messageSchema).describe('Array of messages forming the conversation'),
      temperature: z
        .number()
        .min(0)
        .max(2)
        .optional()
        .describe(
          'Sampling temperature between 0 and 2. Higher values make output more random'
        ),
      topP: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Nucleus sampling: only consider tokens with top_p cumulative probability'),
      maxCompletionTokens: z
        .number()
        .optional()
        .describe('Maximum number of tokens to generate'),
      stop: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Up to 4 sequences where generation will stop'),
      seed: z.number().optional().describe('Seed for deterministic sampling'),
      tools: z
        .array(toolDefinitionSchema)
        .optional()
        .describe('List of tool/function definitions the model may call'),
      toolChoice: z
        .union([
          z.enum(['none', 'auto', 'required']),
          z.object({
            type: z.literal('function'),
            function: z.object({ name: z.string() })
          })
        ])
        .optional()
        .describe('Controls tool usage: "none", "auto", "required", or specify a function'),
      parallelToolCalls: z
        .boolean()
        .optional()
        .describe('Whether to allow parallel function calling'),
      responseFormat: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Output format specification. Use {"type": "json_object"} for JSON mode or {"type": "json_schema", "json_schema": {...}} for strict structured output'
        ),
      reasoningFormat: z
        .enum(['parsed', 'raw', 'hidden'])
        .optional()
        .describe(
          'How to include chain-of-thought reasoning: "parsed" separates it, "raw" includes in content, "hidden" excludes it'
        ),
      reasoningEffort: z
        .string()
        .optional()
        .describe(
          'Reasoning effort level. Qwen3: "none" or "default". GPT-OSS: "low", "medium", or "high"'
        )
    })
  )
  .output(
    z.object({
      completionId: z.string().describe('Unique identifier for this completion'),
      model: z.string().describe('Model used for generation'),
      content: z.string().nullable().describe('Generated text content'),
      reasoning: z
        .string()
        .nullable()
        .optional()
        .describe(
          'Chain-of-thought reasoning output (when using reasoning models with parsed format)'
        ),
      finishReason: z
        .string()
        .describe('Why generation stopped: "stop", "length", "tool_calls", etc.'),
      toolCalls: z
        .array(
          z.object({
            toolCallId: z.string().describe('Unique ID of the tool call'),
            functionName: z.string().describe('Name of the function to call'),
            arguments: z.string().describe('JSON-encoded arguments for the function')
          })
        )
        .optional()
        .describe('Tool calls requested by the model'),
      promptTokens: z.number().describe('Number of tokens in the prompt'),
      completionTokens: z.number().describe('Number of tokens in the completion'),
      totalTokens: z.number().describe('Total tokens used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let messages = ctx.input.messages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant' | 'tool',
      content: msg.content,
      name: msg.name,
      tool_call_id: msg.toolCallId
    }));

    let result = await client.createChatCompletion({
      model: ctx.input.model,
      messages,
      temperature: ctx.input.temperature,
      topP: ctx.input.topP,
      maxCompletionTokens: ctx.input.maxCompletionTokens,
      stop: ctx.input.stop,
      stream: false,
      tools: ctx.input.tools,
      toolChoice: ctx.input.toolChoice,
      parallelToolCalls: ctx.input.parallelToolCalls,
      responseFormat: ctx.input.responseFormat,
      seed: ctx.input.seed,
      reasoningFormat: ctx.input.reasoningFormat,
      reasoningEffort: ctx.input.reasoningEffort
    });

    let choice = result.choices[0];

    let toolCalls = choice?.message?.tool_calls?.map(tc => ({
      toolCallId: tc.id,
      functionName: tc.function.name,
      arguments: tc.function.arguments
    }));

    return {
      output: {
        completionId: result.id,
        model: result.model,
        content: choice?.message?.content ?? null,
        reasoning: choice?.message?.reasoning ?? null,
        finishReason: choice?.finish_reason ?? 'unknown',
        toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
        promptTokens: result.usage.prompt_tokens,
        completionTokens: result.usage.completion_tokens,
        totalTokens: result.usage.total_tokens
      },
      message: `Generated text using **${result.model}**. Used ${result.usage.total_tokens} tokens (${result.usage.prompt_tokens} prompt + ${result.usage.completion_tokens} completion). Finish reason: ${choice?.finish_reason ?? 'unknown'}.`
    };
  })
  .build();
