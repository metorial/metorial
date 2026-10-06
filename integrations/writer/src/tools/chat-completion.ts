import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { WriterClient } from '../lib/client';
import { spec } from '../spec';

let messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']).describe('Role of the message sender'),
  content: z
    .string()
    .optional()
    .describe('Text content. Omit only for an assistant message containing toolCalls.'),
  name: z.string().optional().describe('Name of the participant in multi-user conversations'),
  toolCallId: z
    .string()
    .optional()
    .describe('ID of the tool call this message responds to (for tool role)'),
  toolCalls: z
    .array(
      z.object({
        toolCallId: z.string().describe('Tool-call ID from a previous assistant response.'),
        functionName: z.string().describe('Function name requested by the assistant.'),
        functionArguments: z
          .string()
          .describe('JSON-encoded function arguments requested by the assistant.')
      })
    )
    .optional()
    .describe(
      'Preserve assistant tool calls in conversation history before sending tool results.'
    )
});

let functionToolSchema = z.object({
  type: z.literal('function'),
  function: z.object({
    name: z.string().describe('Name of the function'),
    description: z.string().optional().describe('Description of the function purpose'),
    parameters: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('JSON Schema for function parameters')
  })
});

let graphToolSchema = z.object({
  type: z.literal('graph'),
  graphIds: z
    .array(z.string())
    .min(1)
    .describe('Knowledge Graph IDs to query. Call list_knowledge_graphs to discover IDs.'),
  subqueries: z.boolean().optional().describe('Enable subquery decomposition')
});

let webSearchToolSchema = z.object({
  type: z.literal('web_search'),
  includeDomains: z
    .array(z.string())
    .optional()
    .describe('Only include results from these domains'),
  excludeDomains: z.array(z.string()).optional().describe('Exclude results from these domains')
});

let toolSchema = z.union([functionToolSchema, graphToolSchema, webSearchToolSchema]);

export let chatCompletion = SlateTool.create(spec, {
  name: 'Chat Completion',
  key: 'chat_completion',
  description: `Generate AI responses from conversation history using Writer's Palmyra models. Supports multi-turn conversations with system, user, and assistant messages. Can leverage **tool calling** with custom functions, Knowledge Graph queries, and web search. Use **response format** to get structured JSON output (compatible models).`,
  instructions: [
    'Include a system message to set the model behavior and tone.',
    'For tool calling, define tools and set toolChoice to "auto", "required", or a specific function object.',
    'When a tool call is returned, send the result back as a message with role "tool" and the matching toolCallId.'
  ],
  constraints: [
    'Streaming is not supported through this tool. Responses are returned as complete messages.',
    'Only one built-in tool (graph or web_search) can be used per request, but multiple custom function tools are allowed.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .enum([
          'palmyra-x6',
          'palmyra-x5',
          'palmyra-x4',
          'palmyra-fin',
          'palmyra-med',
          'palmyra-creative',
          'palmyra-x-003-instruct'
        ])
        .optional()
        .describe('Palmyra model to use. Choose this or modelId.'),
      modelId: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Any available model ID from list_models, including external models. Choose this or model.'
        ),
      messages: z
        .array(messageSchema)
        .min(1)
        .describe('Conversation history as an array of messages'),
      temperature: z
        .number()
        .min(0)
        .max(2)
        .optional()
        .describe('Controls randomness (0 = deterministic, 2 = creative). Default: 1'),
      maxTokens: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum number of tokens to generate in the response'),
      topP: z.number().min(0).max(1).optional().describe('Nucleus sampling threshold (0-1)'),
      stop: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Stop sequence(s) that halt generation'),
      tools: z.array(toolSchema).optional().describe('Tool definitions the model can invoke'),
      toolChoice: z
        .union([
          z.enum(['auto', 'none', 'required']),
          z.object({
            type: z.literal('function'),
            function: z.object({ name: z.string() })
          })
        ])
        .optional()
        .describe('Controls how the model uses tools'),
      responseFormat: z
        .object({
          type: z.enum(['text', 'json_schema']).describe('Response format type'),
          jsonSchema: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('JSON Schema for structured output (palmyra-x4/x5 only)')
        })
        .optional()
        .describe('Format of the response output'),
      n: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Number of completion choices to generate')
    })
  )
  .output(
    z.object({
      completionId: z.string().describe('Unique ID of the completion'),
      model: z.string().describe('Model used for generation'),
      choices: z
        .array(
          z.object({
            index: z.number().describe('Choice index'),
            finishReason: z
              .string()
              .describe(
                'Reason generation stopped (stop, length, content_filter, tool_calls)'
              ),
            message: z.object({
              graphData: z
                .record(z.string(), z.unknown())
                .optional()
                .describe('Knowledge Graph source metadata, when returned.'),
              webSearchData: z
                .record(z.string(), z.unknown())
                .optional()
                .describe('Web-search sources and metadata, when returned.'),
              refusal: z
                .string()
                .nullable()
                .optional()
                .describe('Provider refusal reason, when returned.'),
              role: z.string().describe('Role of the responder'),
              content: z.string().nullable().describe('Generated text content'),
              toolCalls: z
                .array(
                  z.object({
                    toolCallId: z.string().describe('Unique ID of this tool call'),
                    type: z.string().describe('Type of tool call'),
                    functionName: z.string().describe('Name of the function to call'),
                    functionArguments: z
                      .string()
                      .describe('JSON-encoded arguments for the function')
                  })
                )
                .optional()
                .describe('Tool calls requested by the model')
            })
          })
        )
        .describe('Generated completion choices'),
      usage: z
        .object({
          promptTokens: z.number().describe('Tokens used in the prompt'),
          completionTokens: z.number().describe('Tokens used in the completion'),
          totalTokens: z.number().describe('Total tokens used')
        })
        .describe('Token usage statistics')
    })
  )
  .handleInvocation(async ctx => {
    if ((ctx.input.model === undefined) === (ctx.input.modelId === undefined)) {
      throw createApiServiceError(
        'Provide either model or modelId. Call list_models to discover available IDs.'
      );
    }
    if ((ctx.input.tools?.filter(t => t.type !== 'function').length ?? 0) > 1) {
      throw createApiServiceError(
        'Writer accepts one built-in tool per request. Remove extra graph or web_search tools.'
      );
    }
    if (
      ctx.input.responseFormat?.type === 'json_schema' &&
      !ctx.input.responseFormat.jsonSchema
    ) {
      throw createApiServiceError(
        'Provide responseFormat.jsonSchema when type is json_schema.'
      );
    }
    if (ctx.input.responseFormat?.type === 'text' && ctx.input.responseFormat.jsonSchema) {
      throw createApiServiceError(
        'Use responseFormat.type json_schema when providing jsonSchema.'
      );
    }
    if (
      ctx.input.toolChoice &&
      ctx.input.toolChoice !== 'auto' &&
      ctx.input.toolChoice !== 'none' &&
      !ctx.input.tools?.length
    ) {
      throw createApiServiceError('Provide tools when requiring a tool call.');
    }
    let pendingToolCalls = new Set<string>();
    for (let message of ctx.input.messages) {
      if (
        message.content === undefined &&
        (message.role !== 'assistant' || !message.toolCalls?.length)
      ) {
        throw createApiServiceError(
          'Provide content for each message, except assistant messages containing toolCalls.'
        );
      }
      if (pendingToolCalls.size && message.role !== 'tool') {
        throw createApiServiceError(
          'Send a tool result for every preceding assistant tool call before continuing the conversation.'
        );
      }
      if (message.toolCalls?.length && message.role !== 'assistant') {
        throw createApiServiceError('Only assistant messages can contain toolCalls.');
      }
      for (let call of message.toolCalls ?? []) pendingToolCalls.add(call.toolCallId);
      if (message.role === 'tool') {
        if (!message.toolCallId || !pendingToolCalls.delete(message.toolCallId)) {
          throw createApiServiceError(
            'Each tool message must match a preceding assistant toolCalls entry by toolCallId.'
          );
        }
      } else if (message.toolCallId) {
        throw createApiServiceError('toolCallId is only valid for tool messages.');
      }
    }
    if (pendingToolCalls.size)
      throw createApiServiceError(
        'Provide a tool result message for each assistant tool call before requesting a completion.'
      );
    let model = ctx.input.modelId ?? ctx.input.model;
    if (!model)
      throw createApiServiceError(
        'Choose a model using list_models before generating content.'
      );
    let client = new WriterClient(ctx.auth.token);

    let tools = ctx.input.tools?.map(t => {
      if (t.type === 'function') {
        return {
          type: 'function' as const,
          function: t.function
        };
      }
      if (t.type === 'graph') {
        return {
          type: 'graph' as const,
          function: { graph_ids: t.graphIds, subqueries: t.subqueries ?? false }
        };
      }
      return {
        type: 'web_search' as const,
        function: {
          include_domains: t.includeDomains ?? [],
          exclude_domains: t.excludeDomains ?? []
        }
      };
    });

    let toolChoice = ctx.input.toolChoice;

    let responseFormat: Record<string, unknown> | undefined;
    if (ctx.input.responseFormat) {
      responseFormat = { type: ctx.input.responseFormat.type };
      if (ctx.input.responseFormat.jsonSchema) {
        responseFormat.json_schema =
          'schema' in ctx.input.responseFormat.jsonSchema
            ? ctx.input.responseFormat.jsonSchema
            : { schema: ctx.input.responseFormat.jsonSchema };
      }
    }

    let messages = ctx.input.messages.map(m => ({
      role: m.role,
      content: m.content ?? null,
      name: m.name,
      tool_call_id: m.toolCallId,
      tool_calls: m.toolCalls?.map(call => ({
        id: call.toolCallId,
        type: 'function',
        function: { name: call.functionName, arguments: call.functionArguments }
      }))
    }));

    ctx.progress('Generating chat completion...');

    let result = await client.chatCompletion({
      model,
      messages,
      temperature: ctx.input.temperature,
      maxTokens: ctx.input.maxTokens,
      topP: ctx.input.topP,
      stop: ctx.input.stop,
      tools,
      toolChoice,
      responseFormat,
      n: ctx.input.n,
      stream: false
    });

    let choices = result.choices.map(c => ({
      index: c.index,
      finishReason: c.finishReason,
      message: {
        role: c.message.role,
        content: c.message.content,
        graphData: c.message.graphData,
        webSearchData: c.message.webSearchData,
        refusal: c.message.refusal,
        toolCalls: c.message.toolCalls?.map(tc => ({
          toolCallId: tc.id,
          type: tc.type,
          functionName: tc.function.name,
          functionArguments: tc.function.arguments
        }))
      }
    }));

    let firstContent = choices[0]?.message.content;
    let hasToolCalls = choices.some(
      c => c.message.toolCalls && c.message.toolCalls.length > 0
    );
    let summary = hasToolCalls
      ? `Model requested **${choices[0]?.message.toolCalls?.length}** tool call(s). Finish reason: \`${choices[0]?.finishReason}\``
      : `Generated response with **${result.usage.completionTokens}** tokens. Finish reason: \`${choices[0]?.finishReason}\``;

    if (firstContent && firstContent.length > 200) {
      summary += `\n\n> ${firstContent.substring(0, 200)}...`;
    } else if (firstContent) {
      summary += `\n\n> ${firstContent}`;
    }

    return {
      output: {
        completionId: result.completionId,
        model: result.model,
        choices,
        usage: result.usage
      },
      message: summary
    };
  })
  .build();
