import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { groqCloudServiceError } from '../lib/errors';
import { spec } from '../spec';

let responseMessageSchema = z.object({
  role: z
    .enum(['system', 'developer', 'user', 'assistant'])
    .describe('Role of the response input item'),
  content: z.string().describe('Text content for this response input item')
});

let responseOutputSchema = z.object({
  responseId: z.string().describe('Unique identifier for this response'),
  status: z.string().describe('Response status, such as completed, failed, or incomplete'),
  model: z.string().nullable().describe('Model used for the response'),
  outputText: z.string().nullable().describe('Generated text output, when present'),
  outputItems: z.array(z.unknown()).describe('Raw response output items'),
  inputTokens: z.number().describe('Number of input tokens used'),
  outputTokens: z.number().describe('Number of output tokens generated'),
  totalTokens: z.number().describe('Total tokens used')
});

let buildInput = (params: {
  input?: string;
  messages?: Array<{ role: string; content: string }>;
}) => {
  let hasInput = params.input !== undefined && params.input.trim().length > 0;
  let hasMessages = params.messages !== undefined && params.messages.length > 0;

  if (hasInput === hasMessages) {
    throw groqCloudServiceError(
      'Provide exactly one of input or messages for create_response.'
    );
  }

  return hasInput ? params.input! : params.messages!;
};

let buildTextConfig = (responseFormat?: string, jsonSchema?: Record<string, unknown>) => {
  if (!responseFormat) {
    return undefined;
  }

  if (responseFormat === 'text') {
    return { format: { type: 'text' } };
  }

  if (responseFormat === 'json_object') {
    return { format: { type: 'json_object' } };
  }

  if (!jsonSchema) {
    throw groqCloudServiceError(
      'jsonSchema is required when responseFormat is "json_schema".'
    );
  }

  let hasFullConfig = typeof jsonSchema.name === 'string' && jsonSchema.schema !== undefined;

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

let mapResponseOutput = (result: {
  id: string;
  status: string;
  model?: string | null;
  output?: unknown[];
  output_text?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
}) => {
  let outputText: string | null =
    typeof result.output_text === 'string' ? result.output_text : null;

  if (!outputText && result.output) {
    for (let item of result.output) {
      if (typeof item !== 'object' || item === null) {
        continue;
      }

      let typedItem = item as {
        type?: string;
        content?: Array<{ type?: string; text?: unknown }>;
      };
      if (typedItem.type !== 'message' || !Array.isArray(typedItem.content)) {
        continue;
      }

      for (let content of typedItem.content) {
        if (content.type === 'output_text' && typeof content.text === 'string') {
          outputText = content.text;
          break;
        }
      }

      if (outputText) {
        break;
      }
    }
  }

  let inputTokens = result.usage?.input_tokens ?? 0;
  let outputTokens = result.usage?.output_tokens ?? 0;

  return {
    responseId: result.id,
    status: result.status,
    model: result.model ?? null,
    outputText,
    outputItems: result.output ?? [],
    inputTokens,
    outputTokens,
    totalTokens: result.usage?.total_tokens ?? inputTokens + outputTokens
  };
};

export let createResponse = SlateTool.create(spec, {
  name: 'Create Response',
  key: 'create_response',
  description: `Generate a model response using Groq's Responses API. Supports simple text input, message arrays, structured outputs, tool definitions, and reasoning controls through the OpenAI-compatible /responses endpoint.`,
  instructions: [
    'Provide either input for a single-turn prompt or messages for a message-array request.',
    'For structured JSON output, set responseFormat to "json_object" or "json_schema".',
    'For reasoning models, set reasoningEffort to a value supported by the selected model.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      model: z.string().describe('Model ID to use, such as "openai/gpt-oss-20b"'),
      input: z
        .string()
        .optional()
        .describe('Single-turn text input. Provide either input or messages, not both'),
      messages: z
        .array(responseMessageSchema)
        .optional()
        .describe('Message-array input. Provide either messages or input, not both'),
      instructions: z.string().optional().describe('System or developer instructions'),
      temperature: z.number().min(0).max(2).optional().describe('Sampling temperature'),
      topP: z.number().min(0).max(1).optional().describe('Nucleus sampling parameter'),
      maxOutputTokens: z.number().optional().describe('Maximum output tokens to generate'),
      tools: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Tools available to the model, such as function definitions'),
      toolChoice: z
        .unknown()
        .optional()
        .describe('Tool-choice control, such as "auto", "none", "required", or an object'),
      responseFormat: z
        .enum(['text', 'json_object', 'json_schema'])
        .optional()
        .describe('Response text format'),
      jsonSchema: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'JSON Schema or full json_schema config when responseFormat is "json_schema"'
        ),
      reasoningEffort: z
        .enum(['none', 'default', 'low', 'medium', 'high'])
        .optional()
        .describe('Reasoning effort for models that support reasoning'),
      parallelToolCalls: z.boolean().optional().describe('Enable parallel tool calls'),
      serviceTier: z
        .enum(['auto', 'default', 'flex'])
        .optional()
        .describe('Latency tier for processing the request'),
      truncation: z
        .enum(['auto', 'disabled'])
        .optional()
        .describe('Context truncation behavior'),
      store: z
        .boolean()
        .optional()
        .describe('Response storage flag. Groq currently supports false or null'),
      metadata: z.record(z.string(), z.string()).optional().describe('Response metadata'),
      user: z.string().optional().describe('End-user identifier for monitoring')
    })
  )
  .output(responseOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let text = buildTextConfig(ctx.input.responseFormat, ctx.input.jsonSchema);
    let reasoning = ctx.input.reasoningEffort
      ? { effort: ctx.input.reasoningEffort }
      : undefined;

    let result = await client.createResponse({
      model: ctx.input.model,
      input: buildInput({
        input: ctx.input.input,
        messages: ctx.input.messages
      }),
      instructions: ctx.input.instructions,
      temperature: ctx.input.temperature,
      topP: ctx.input.topP,
      maxOutputTokens: ctx.input.maxOutputTokens,
      tools: ctx.input.tools,
      toolChoice: ctx.input.toolChoice,
      text,
      reasoning,
      parallelToolCalls: ctx.input.parallelToolCalls,
      serviceTier: ctx.input.serviceTier,
      truncation: ctx.input.truncation,
      store: ctx.input.store,
      metadata: ctx.input.metadata,
      user: ctx.input.user
    });
    let output = mapResponseOutput(result);

    return {
      output,
      message: `Response **${result.id}** generated using **${output.model ?? ctx.input.model}**. Status: ${output.status}. Tokens: ${output.totalTokens}.`
    };
  })
  .build();
