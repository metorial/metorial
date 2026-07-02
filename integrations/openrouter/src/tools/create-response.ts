import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let responseInputItemSchema = z.record(z.string(), z.unknown());

let responseUsageSchema = z.object({
  inputTokens: z.number().describe('Input tokens used'),
  outputTokens: z.number().describe('Output tokens generated'),
  totalTokens: z.number().describe('Total tokens used')
});

let extractOutputText = (result: Record<string, unknown>) => {
  if (typeof result.output_text === 'string') return result.output_text;

  let output = result.output;
  if (!Array.isArray(output)) return null;

  for (let item of output) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    let content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;

    for (let part of content) {
      if (!part || typeof part !== 'object' || Array.isArray(part)) continue;
      let record = part as Record<string, unknown>;
      if (record.type === 'output_text' && typeof record.text === 'string') {
        return record.text;
      }
    }
  }

  return null;
};

export let createResponse = SlateTool.create(spec, {
  name: 'Create Response',
  key: 'create_response',
  description: `Create a response using OpenRouter's OpenResponses-compatible API. Use this for current Responses API workflows with text or multimodal inputs, tools, reasoning settings, provider routing, metadata, and session stickiness.`,
  instructions: [
    'Use input as a simple string for one-shot prompts, or an array of response input items for multi-turn or tool workflows.',
    'Use text for structured-output configuration and reasoning for extended-thinking model settings.',
    'Set sessionId when related calls should prefer the same upstream provider.'
  ],
  constraints: [
    'Streaming is not supported through this tool; responses are returned in full.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      model: z
        .string()
        .optional()
        .describe('Model ID to use. If omitted, OpenRouter uses the payer default.'),
      input: z
        .union([z.string(), z.array(responseInputItemSchema)])
        .describe('Response input as a string or array of OpenResponses input items'),
      instructions: z.string().optional().describe('System-level instructions'),
      maxOutputTokens: z.number().optional().describe('Maximum output tokens'),
      temperature: z.number().min(0).max(2).optional().describe('Sampling temperature'),
      topP: z.number().min(0).max(1).optional().describe('Nucleus sampling parameter'),
      topK: z.number().optional().describe('Top-K sampling parameter'),
      tools: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Function tools or OpenRouter server tools available to the model'),
      toolChoice: z
        .union([z.string(), z.record(z.string(), z.unknown())])
        .optional()
        .describe('Tool choice setting, such as "auto", or an object forcing a tool'),
      parallelToolCalls: z
        .boolean()
        .optional()
        .describe('Whether the model may produce parallel tool calls'),
      provider: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Provider routing preferences'),
      plugins: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('OpenRouter plugins, such as web or file-parser'),
      reasoning: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Reasoning configuration for supported models'),
      modalities: z
        .array(z.enum(['text', 'image']))
        .optional()
        .describe('Requested output modalities'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Request metadata, up to 16 key-value pairs'),
      previousResponseId: z
        .string()
        .optional()
        .describe('Previous response ID for conversation continuity'),
      sessionId: z
        .string()
        .optional()
        .describe('Stable session identifier for provider stickiness and observability'),
      serviceTier: z.string().optional().describe('Service tier to use for routing'),
      text: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Text output configuration, including format and verbosity'),
      trace: z.record(z.string(), z.unknown()).optional().describe('Observability metadata'),
      user: z.string().optional().describe('Stable end-user identifier')
    })
  )
  .output(
    z.object({
      responseId: z.string().describe('Response ID'),
      status: z.string().optional().describe('Response status'),
      model: z.string().optional().describe('Model used'),
      outputText: z.string().nullable().describe('Flattened text output when present'),
      outputItems: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Full response output items'),
      usage: responseUsageSchema.optional().describe('Token usage'),
      openrouterMetadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('OpenRouter routing metadata when returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      siteUrl: ctx.config.siteUrl,
      appTitle: ctx.config.appTitle
    });

    let result = await client.createResponse({
      model: ctx.input.model,
      input: ctx.input.input,
      instructions: ctx.input.instructions,
      maxOutputTokens: ctx.input.maxOutputTokens,
      temperature: ctx.input.temperature,
      topP: ctx.input.topP,
      topK: ctx.input.topK,
      tools: ctx.input.tools,
      toolChoice: ctx.input.toolChoice,
      parallelToolCalls: ctx.input.parallelToolCalls,
      provider: ctx.input.provider,
      plugins: ctx.input.plugins,
      reasoning: ctx.input.reasoning,
      modalities: ctx.input.modalities,
      metadata: ctx.input.metadata,
      previousResponseId: ctx.input.previousResponseId,
      sessionId: ctx.input.sessionId,
      serviceTier: ctx.input.serviceTier,
      text: ctx.input.text,
      trace: ctx.input.trace,
      user: ctx.input.user
    });

    let usage = result.usage as Record<string, unknown> | undefined;
    let outputItems = Array.isArray(result.output)
      ? (result.output as Record<string, unknown>[])
      : [];

    let output = {
      responseId: (result.id as string) || '',
      status: (result.status as string) || undefined,
      model: (result.model as string) || undefined,
      outputText: extractOutputText(result),
      outputItems,
      ...(usage
        ? {
            usage: {
              inputTokens:
                (usage.input_tokens as number) ?? (usage.prompt_tokens as number) ?? 0,
              outputTokens:
                (usage.output_tokens as number) ?? (usage.completion_tokens as number) ?? 0,
              totalTokens: (usage.total_tokens as number) ?? 0
            }
          }
        : {}),
      ...(result.openrouter_metadata
        ? { openrouterMetadata: result.openrouter_metadata as Record<string, unknown> }
        : {})
    };

    return {
      output,
      message: `Response **${output.responseId || 'unknown'}** completed with status **${output.status || 'unknown'}**.`
    };
  })
  .build();
