import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

let messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']).describe('The role of the message author'),
  content: z.string().describe('The content of the message')
});

let toolFunctionSchema = z.object({
  type: z.literal('function').describe('The type of the tool'),
  function: z.object({
    name: z.string().describe('The name of the function'),
    description: z.string().optional().describe('A description of what the function does'),
    parameters: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('The parameters the function accepts as a JSON Schema object')
  })
});

export let chatCompletion = SlateTool.create(spec, {
  name: 'Chat Completion',
  key: 'chat_completion',
  description: `Send conversational prompts to hundreds of AI language models through a unified endpoint. Supports advanced features including web search grounding, RAG augmentation, persistent memory, hallucination reduction via integrity checking, and function calling/tools.`,
  instructions: [
    'Set "online" to true to augment responses with live web search results.',
    'Use "ragTune" to reference a previously uploaded document collection for RAG augmentation.',
    'Set "integrity" to 12 or 13 for hallucination reduction via multi-query election.',
    'Use "memory" and "memSession" for persistent conversational memory across requests.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe('Model identifier (e.g., "gpt-4o", "claude-3-opus", "gemini-pro")'),
      messages: z.array(messageSchema).describe('Array of conversation messages'),
      provider: z
        .string()
        .optional()
        .describe(
          'Specific provider to use (e.g., "openrouter", "openai"). Omit for auto-selection.'
        ),
      maxTokens: z.number().optional().describe('Maximum number of tokens to generate'),
      temperature: z
        .number()
        .min(0)
        .max(2)
        .optional()
        .describe('Sampling temperature (0-2). Lower is more deterministic.'),
      topP: z.number().min(0).max(1).optional().describe('Nucleus sampling threshold (0-1)'),
      topK: z.number().optional().describe('Top-k token selection limit'),
      frequencyPenalty: z
        .number()
        .optional()
        .describe('Penalty for repeated tokens (-2 to 2)'),
      presencePenalty: z
        .number()
        .optional()
        .describe('Penalty for previously used tokens (-2 to 2)'),
      n: z.number().optional().describe('Number of completions to generate'),
      routing: z
        .enum(['price', 'perf', 'perf_avg'])
        .optional()
        .describe(
          'Routing strategy: "price" for cost-optimized, "perf" for performance-optimized'
        ),
      tools: z.array(toolFunctionSchema).optional().describe('Functions the model may call'),
      toolChoice: z
        .string()
        .optional()
        .describe(
          'Controls function calling behavior: "auto", "none", or a specific function name'
        ),
      responseFormat: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Response format specification (e.g., { "type": "json_object" })'),
      online: z
        .boolean()
        .optional()
        .describe('Enable live web search grounding for the response'),
      searches: z
        .number()
        .optional()
        .describe('Number of web search queries to execute (when online is enabled)'),
      pull: z.number().optional().describe('Number of search results to pull'),
      use: z.number().optional().describe('Number of search results to inject into context'),
      scrapeLength: z.number().optional().describe('Maximum characters to scrape per page'),
      searchLang: z.string().optional().describe('Language code for web search (e.g., "en")'),
      searchGeo: z.string().optional().describe('Geographic code for web search (e.g., "US")'),
      webSearchContextSize: z
        .enum(['low', 'medium', 'high'])
        .optional()
        .describe('OpenAI-compatible search context size'),
      ragTune: z
        .string()
        .optional()
        .describe('RAG collection name to augment the response with your uploaded documents'),
      integrity: z
        .number()
        .optional()
        .describe(
          'Hallucination reduction level (12 or 13). Queries the model multiple times and uses election.'
        ),
      memory: z
        .number()
        .optional()
        .describe('Set to 1 to enable persistent conversational memory'),
      memSession: z.string().optional().describe('Session ID for memory context grouping'),
      memExpire: z.number().optional().describe('Memory expiration in minutes (max 1440)'),
      memClear: z.boolean().optional().describe('Set to true to clear the session memory')
    })
  )
  .output(
    z.object({
      completionId: z.string().describe('Unique identifier for this completion'),
      model: z.string().describe('The model that generated the response'),
      provider: z.string().optional().describe('The provider that served the request'),
      content: z.string().nullable().describe('The generated text content'),
      finishReason: z
        .string()
        .nullable()
        .describe('Reason the generation stopped (e.g., "stop", "length", "tool_calls")'),
      toolCalls: z
        .array(
          z.object({
            toolCallId: z.string().describe('Unique ID for the tool call'),
            functionName: z.string().describe('Name of the function to call'),
            arguments: z.string().describe('JSON string of function arguments')
          })
        )
        .optional()
        .describe('Tool/function calls requested by the model'),
      promptTokens: z.number().describe('Number of tokens in the prompt'),
      completionTokens: z.number().describe('Number of tokens in the completion'),
      totalTokens: z.number().describe('Total tokens used'),
      cost: z.number().optional().describe('Cost of this request in USD'),
      latencyMs: z.number().optional().describe('Response latency in milliseconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.chatCompletion({
      model: ctx.input.model,
      messages: ctx.input.messages,
      provider: ctx.input.provider,
      maxTokens: ctx.input.maxTokens,
      temperature: ctx.input.temperature,
      topP: ctx.input.topP,
      topK: ctx.input.topK,
      frequencyPenalty: ctx.input.frequencyPenalty,
      presencePenalty: ctx.input.presencePenalty,
      n: ctx.input.n,
      routing: ctx.input.routing,
      tools: ctx.input.tools,
      toolChoice: ctx.input.toolChoice,
      responseFormat: ctx.input.responseFormat,
      online: ctx.input.online,
      searches: ctx.input.searches,
      pull: ctx.input.pull,
      use: ctx.input.use,
      scrapeLength: ctx.input.scrapeLength,
      searchLang: ctx.input.searchLang,
      searchGeo: ctx.input.searchGeo,
      webSearchContextSize: ctx.input.webSearchContextSize,
      ragTune: ctx.input.ragTune,
      integrity: ctx.input.integrity,
      memory: ctx.input.memory,
      memSession: ctx.input.memSession,
      memExpire: ctx.input.memExpire,
      memClear: ctx.input.memClear
    });

    let choice = result.choices?.[0];
    let message = choice?.message;

    let toolCalls = message?.tool_calls?.map((tc: any) => ({
      toolCallId: tc.id,
      functionName: tc.function?.name,
      arguments: tc.function?.arguments
    }));

    let content = message?.content ?? null;
    let finishReason = choice?.finish_reason ?? null;

    let contentPreview = content
      ? content.length > 200
        ? `${content.substring(0, 200)}...`
        : content
      : '(no text content)';

    return {
      output: {
        completionId: result.id,
        model: result.model,
        provider: result.provider,
        content,
        finishReason,
        toolCalls,
        promptTokens: result.usage?.prompt_tokens ?? 0,
        completionTokens: result.usage?.completion_tokens ?? 0,
        totalTokens: result.usage?.total_tokens ?? 0,
        cost: result.usage?.cost,
        latencyMs: result.usage?.latency_ms
      },
      message: `Generated completion using **${result.model}**${result.provider ? ` via ${result.provider}` : ''}. ${result.usage?.total_tokens ?? 0} tokens used${result.usage?.cost ? ` ($${result.usage.cost.toFixed(6)})` : ''}.\n\n> ${contentPreview}`
    };
  })
  .build();
