import { SlateTool } from 'slates';
import { z } from 'zod';
import { MistralClient } from '../lib/client';
import { spec } from '../spec';

let messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']).describe('Role of the message sender'),
  content: z.string().describe('Content of the message'),
  name: z.string().optional().describe('Name of the participant'),
  toolCallId: z
    .string()
    .optional()
    .describe('ID of the tool call this message responds to (for tool role)')
});

let toolDefinitionSchema = z.object({
  type: z.literal('function').describe('Tool type'),
  function: z.object({
    name: z.string().describe('Function name'),
    description: z.string().optional().describe('Function description'),
    parameters: z.any().optional().describe('JSON Schema for function parameters')
  })
});

let toolCallSchema = z.object({
  toolCallId: z.string().describe('Unique ID for this tool call'),
  type: z.literal('function').describe('Tool call type'),
  function: z.object({
    name: z.string().describe('Function name called'),
    arguments: z.string().describe('JSON-encoded function arguments')
  })
});

let choiceSchema = z.object({
  index: z.number().describe('Choice index'),
  message: z.object({
    role: z.string().describe('Role of the response message'),
    content: z.string().nullable().describe('Text content of the response'),
    toolCalls: z.array(toolCallSchema).optional().describe('Tool calls requested by the model')
  }),
  finishReason: z.string().describe('Reason the model stopped generating')
});

let usageSchema = z.object({
  promptTokens: z.number().describe('Tokens used in the prompt'),
  completionTokens: z.number().describe('Tokens used in the completion'),
  totalTokens: z.number().describe('Total tokens used')
});

export let chatCompletionTool = SlateTool.create(spec, {
  name: 'Chat Completion',
  key: 'chat_completion',
  description: `Generate a chat completion using Mistral AI models. Supports multi-turn conversations with system, user, assistant, and tool messages. Can use function calling, structured JSON output, and safety prompts.`,
  instructions: [
    'Use models like "mistral-large-latest", "mistral-small-latest", or "mistral-medium-latest" for general chat.',
    'For reasoning tasks, use "magistral-medium-latest" or "magistral-small-latest".',
    'Use reasoningEffort instead of the deprecated prompt_mode parameter for reasoning models.',
    'Set responseFormat to {"type":"json_object"} for JSON output, or {"type":"json_schema","json_schema":{"name":"...","schema":{...}}} for structured output.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe('Model ID to use (e.g., "mistral-large-latest", "mistral-small-latest")'),
      messages: z.array(messageSchema).describe('Conversation messages'),
      temperature: z
        .number()
        .min(0)
        .max(1.5)
        .optional()
        .describe('Sampling temperature (0.0-1.5)'),
      topP: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Nucleus sampling threshold (0.0-1.0)'),
      maxTokens: z.number().optional().describe('Maximum tokens to generate'),
      minTokens: z.number().optional().describe('Minimum tokens to generate'),
      stop: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Stop sequence(s)'),
      randomSeed: z.number().optional().describe('Seed for deterministic output'),
      presencePenalty: z
        .number()
        .min(-2)
        .max(2)
        .optional()
        .describe('Presence penalty (-2.0 to 2.0)'),
      frequencyPenalty: z
        .number()
        .min(-2)
        .max(2)
        .optional()
        .describe('Frequency penalty (-2.0 to 2.0)'),
      n: z.number().min(1).optional().describe('Number of completions to return'),
      responseFormat: z
        .any()
        .optional()
        .describe(
          'Response format: {"type":"text"}, {"type":"json_object"}, or {"type":"json_schema","json_schema":{...}}'
        ),
      tools: z
        .array(toolDefinitionSchema)
        .optional()
        .describe('Tool/function definitions available to the model'),
      toolChoice: z
        .union([z.enum(['none', 'auto', 'any', 'required']), z.any()])
        .optional()
        .describe('Tool selection strategy'),
      parallelToolCalls: z
        .boolean()
        .optional()
        .describe('Whether the model may call multiple tools in parallel'),
      safePrompt: z.boolean().optional().describe('Inject safety system prompt'),
      metadata: z.record(z.string(), z.any()).optional().describe('Request metadata'),
      prediction: z
        .record(z.string(), z.any())
        .optional()
        .describe('Expected output hint for low-latency document/code edits'),
      reasoningEffort: z
        .enum(['high', 'none'])
        .optional()
        .describe('Reasoning effort for reasoning models'),
      guardrails: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Guardrail configurations to apply to this request'),
      promptCacheKey: z.string().optional().describe('Cache key for reusable prompt prefixes')
    })
  )
  .output(
    z.object({
      completionId: z.string().describe('Unique completion ID'),
      model: z.string().describe('Model used'),
      choices: z.array(choiceSchema).describe('Generated completions'),
      usage: usageSchema.describe('Token usage statistics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MistralClient(ctx.auth.token);

    let result = await client.chatCompletion({
      model: ctx.input.model,
      messages: ctx.input.messages,
      temperature: ctx.input.temperature,
      topP: ctx.input.topP,
      maxTokens: ctx.input.maxTokens,
      minTokens: ctx.input.minTokens,
      stop: ctx.input.stop,
      randomSeed: ctx.input.randomSeed,
      presencePenalty: ctx.input.presencePenalty,
      frequencyPenalty: ctx.input.frequencyPenalty,
      n: ctx.input.n,
      responseFormat: ctx.input.responseFormat,
      tools: ctx.input.tools,
      toolChoice: ctx.input.toolChoice,
      parallelToolCalls: ctx.input.parallelToolCalls,
      safePrompt: ctx.input.safePrompt,
      metadata: ctx.input.metadata,
      prediction: ctx.input.prediction,
      reasoningEffort: ctx.input.reasoningEffort,
      guardrails: ctx.input.guardrails,
      promptCacheKey: ctx.input.promptCacheKey
    });

    let choices = (result.choices || []).map((c: any) => ({
      index: c.index,
      message: {
        role: c.message.role,
        content: c.message.content,
        toolCalls: c.message.tool_calls?.map((tc: any) => ({
          toolCallId: tc.id,
          type: tc.type,
          function: tc.function
        }))
      },
      finishReason: c.finish_reason
    }));

    let content = choices[0]?.message?.content || '';
    let preview = content.length > 200 ? `${content.substring(0, 200)}...` : content;

    return {
      output: {
        completionId: result.id,
        model: result.model,
        choices,
        usage: {
          promptTokens: result.usage?.prompt_tokens || 0,
          completionTokens: result.usage?.completion_tokens || 0,
          totalTokens: result.usage?.total_tokens || 0
        }
      },
      message: `Generated completion using **${result.model}** (${result.usage?.total_tokens || 0} tokens).\n\n${preview}`
    };
  })
  .build();
