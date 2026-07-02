import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { openAIServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let responseOutputSchema = z.object({
  responseId: z.string().describe('Response identifier'),
  outputText: z.string().nullable().describe('Generated text output'),
  status: z.string().describe('Response status (e.g. "completed")'),
  model: z.string().nullable().describe('Model used'),
  outputItems: z
    .array(z.any())
    .describe('Full output items including tool calls, messages, etc.'),
  inputTokens: z.number().describe('Number of input tokens'),
  outputTokens: z.number().describe('Number of output tokens'),
  totalTokens: z.number().describe('Total tokens used')
});

let buildTextConfig = (responseFormatType?: string, jsonSchema?: any) => {
  if (!responseFormatType) {
    return undefined;
  }

  if (responseFormatType === 'text') {
    return { format: { type: 'text' } };
  }

  if (responseFormatType === 'json_object') {
    return { format: { type: 'json_object' } };
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
    format: {
      type: 'json_schema',
      ...(hasFullConfig
        ? jsonSchema
        : {
            name: 'response_schema',
            schema: jsonSchema,
            strict: true
          })
    }
  };
};

let mapResponseOutput = (result: any) => {
  let outputText: string | null =
    typeof result.output_text === 'string' ? result.output_text : null;
  if (!outputText && result.output) {
    for (let item of result.output) {
      if (item.type === 'message' && item.content) {
        for (let content of item.content) {
          if (content.type === 'output_text') {
            outputText = content.text;
            break;
          }
        }
      }
      if (outputText) break;
    }
  }

  return {
    responseId: result.id,
    outputText,
    status: result.status,
    model: result.model ?? null,
    outputItems: result.output ?? [],
    inputTokens: result.usage?.input_tokens ?? 0,
    outputTokens: result.usage?.output_tokens ?? 0,
    totalTokens:
      result.usage?.total_tokens ??
      (result.usage?.input_tokens ?? 0) + (result.usage?.output_tokens ?? 0)
  };
};

export let createResponse = SlateTool.create(spec, {
  name: 'Create Response',
  key: 'create_response',
  description: `Generate a response using the OpenAI Responses API, the primary gateway for all model families. Supports text generation, built-in tools (web search, file search, code interpreter), function calling, structured output, and reasoning models with configurable effort levels.`,
  instructions: [
    'Use "input" as a simple string for single-turn prompts, or provide an array of message objects for multi-turn conversations.',
    'For reasoning models, set reasoning.effort to "low", "medium", or "high".',
    'Built-in tools include: web_search, file_search, code_interpreter.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      model: z.string().describe('Model ID to use (e.g. "gpt-4o", "gpt-5", "gpt-5-mini")'),
      input: z
        .union([z.string(), z.array(z.any())])
        .describe('Text prompt or array of input messages'),
      instructions: z.string().optional().describe('System-level instructions for the model'),
      background: z
        .boolean()
        .optional()
        .describe('Run the response in the background for long-running work'),
      previousResponseId: z
        .string()
        .optional()
        .describe('Previous response ID for multi-turn conversation state'),
      include: z
        .array(z.string())
        .optional()
        .describe('Additional output data to include, such as file search results'),
      temperature: z
        .number()
        .min(0)
        .max(2)
        .optional()
        .describe('Sampling temperature between 0 and 2'),
      maxOutputTokens: z.number().optional().describe('Maximum number of tokens to generate'),
      topP: z.number().min(0).max(1).optional().describe('Nucleus sampling parameter'),
      tools: z
        .array(z.any())
        .optional()
        .describe(
          'Tools available to the model (e.g. web_search, file_search, code_interpreter, or function definitions)'
        ),
      toolChoice: z
        .union([z.string(), z.any()])
        .optional()
        .describe('How the model should choose tools'),
      responseFormatType: z
        .enum(['text', 'json_object', 'json_schema'])
        .optional()
        .describe('Format of the response'),
      jsonSchema: z
        .any()
        .optional()
        .describe('JSON Schema when responseFormatType is "json_schema"'),
      reasoningEffort: z
        .enum(['low', 'medium', 'high'])
        .optional()
        .describe('Reasoning effort level for reasoning models'),
      store: z
        .boolean()
        .optional()
        .describe('Whether to store the response for later retrieval'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value metadata to attach'),
      user: z.string().optional().describe('Unique identifier for the end-user')
    })
  )
  .output(responseOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let text = buildTextConfig(ctx.input.responseFormatType, ctx.input.jsonSchema);

    let reasoning: any;
    if (ctx.input.reasoningEffort) {
      reasoning = { effort: ctx.input.reasoningEffort };
    }

    let result = await client.createResponse({
      model: ctx.input.model,
      input: ctx.input.input,
      instructions: ctx.input.instructions,
      background: ctx.input.background,
      previousResponseId: ctx.input.previousResponseId,
      include: ctx.input.include,
      temperature: ctx.input.temperature,
      maxOutputTokens: ctx.input.maxOutputTokens,
      topP: ctx.input.topP,
      tools: ctx.input.tools,
      toolChoice: ctx.input.toolChoice,
      text,
      reasoning,
      store: ctx.input.store,
      metadata: ctx.input.metadata,
      user: ctx.input.user
    });
    let output = mapResponseOutput(result);

    return {
      output,
      message: `Response **${result.id}** generated using **${result.model}**. Status: ${result.status}. Tokens: ${output.totalTokens}.`
    };
  })
  .build();

export let getResponse = SlateTool.create(spec, {
  name: 'Get Response',
  key: 'get_response',
  description:
    'Retrieve a stored OpenAI response by ID, including status, model output items, and token usage.',
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      responseId: z.string().describe('Response ID to retrieve')
    })
  )
  .output(responseOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getResponse(ctx.input.responseId);
    let output = mapResponseOutput(result);

    return {
      output,
      message: `Response **${result.id}** status: ${result.status}.`
    };
  })
  .build();

export let deleteResponse = SlateTool.create(spec, {
  name: 'Delete Response',
  key: 'delete_response',
  description: 'Delete a stored OpenAI response by ID.',
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      responseId: z.string().describe('Response ID to delete')
    })
  )
  .output(
    z.object({
      responseId: z.string().describe('Deleted response ID'),
      deleted: z.boolean().describe('Whether the response was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.deleteResponse(ctx.input.responseId);

    return {
      output: {
        responseId: result.id,
        deleted: result.deleted
      },
      message: `Deleted response **${result.id}**.`
    };
  })
  .build();

export let listResponseInputItems = SlateTool.create(spec, {
  name: 'List Response Input Items',
  key: 'list_response_input_items',
  description: 'List the input items used to create a stored OpenAI response.',
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      responseId: z.string().describe('Response ID whose input items should be listed'),
      limit: z.number().optional().describe('Maximum number of input items to return'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      after: z.string().optional().describe('Cursor for pagination'),
      include: z.array(z.string()).optional().describe('Additional fields to include')
    })
  )
  .output(
    z.object({
      items: z.array(z.any()).describe('Response input items'),
      firstId: z.string().nullable().describe('First item ID in the page'),
      lastId: z.string().nullable().describe('Last item ID in the page'),
      hasMore: z.boolean().describe('Whether more items are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listResponseInputItems(ctx.input.responseId, {
      limit: ctx.input.limit,
      order: ctx.input.order,
      after: ctx.input.after,
      include: ctx.input.include
    });
    let items = result.data ?? [];

    return {
      output: {
        items,
        firstId: result.first_id ?? null,
        lastId: result.last_id ?? null,
        hasMore: result.has_more ?? false
      },
      message: `Found **${items.length}** input item(s) for response **${ctx.input.responseId}**.`
    };
  })
  .build();
