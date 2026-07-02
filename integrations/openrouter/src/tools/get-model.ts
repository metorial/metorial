import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getModel = SlateTool.create(spec, {
  name: 'Get Model',
  key: 'get_model',
  description: `Retrieve detailed information about a specific AI model on OpenRouter, including its pricing, context window, architecture, supported parameters, and top provider details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z
        .string()
        .describe('Model identifier (e.g., "openai/gpt-4o", "anthropic/claude-3.5-sonnet")')
    })
  )
  .output(
    z.object({
      modelId: z.string().describe('Unique model identifier'),
      name: z.string().optional().describe('Human-readable model name'),
      description: z.string().optional().describe('Model description'),
      contextLength: z.number().optional().describe('Maximum context length in tokens'),
      pricing: z
        .object({
          prompt: z.string().optional().describe('Cost per prompt token'),
          completion: z.string().optional().describe('Cost per completion token'),
          image: z.string().optional().describe('Cost per image token'),
          request: z.string().optional().describe('Cost per request')
        })
        .optional()
        .describe('Pricing information'),
      topProvider: z
        .object({
          contextLength: z.number().optional().describe('Context length'),
          maxCompletionTokens: z.number().optional().describe('Max completion tokens'),
          isModerated: z.boolean().optional().describe('Content moderation status')
        })
        .optional()
        .describe('Top provider details'),
      architecture: z
        .object({
          modality: z.string().optional().describe('Input/output modality'),
          tokenizer: z.string().optional().describe('Tokenizer'),
          instructType: z.string().optional().describe('Instruction type')
        })
        .optional()
        .describe('Architecture details'),
      supportedParameters: z
        .array(z.string())
        .optional()
        .describe('List of supported API parameters'),
      createdAt: z.string().optional().describe('When the model was added')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      siteUrl: ctx.config.siteUrl,
      appTitle: ctx.config.appTitle
    });

    let m = await client.getModel(ctx.input.modelId);

    let pricing = m.pricing as Record<string, unknown> | undefined;
    let topProvider = m.top_provider as Record<string, unknown> | undefined;
    let architecture = m.architecture as Record<string, unknown> | undefined;

    let output = {
      modelId: (m.id as string) || ctx.input.modelId,
      name: (m.name as string) || undefined,
      description: (m.description as string) || undefined,
      contextLength: (m.context_length as number) || undefined,
      ...(pricing
        ? {
            pricing: {
              prompt: (pricing.prompt as string) || undefined,
              completion: (pricing.completion as string) || undefined,
              image: (pricing.image as string) || undefined,
              request: (pricing.request as string) || undefined
            }
          }
        : {}),
      ...(topProvider
        ? {
            topProvider: {
              contextLength: (topProvider.context_length as number) || undefined,
              maxCompletionTokens: (topProvider.max_completion_tokens as number) || undefined,
              isModerated: (topProvider.is_moderated as boolean) || undefined
            }
          }
        : {}),
      ...(architecture
        ? {
            architecture: {
              modality: (architecture.modality as string) || undefined,
              tokenizer: (architecture.tokenizer as string) || undefined,
              instructType: (architecture.instruct_type as string) || undefined
            }
          }
        : {}),
      supportedParameters: (m.supported_parameters as string[]) || undefined,
      createdAt: m.created ? String(m.created) : undefined
    };

    return {
      output,
      message: `Retrieved model **${output.name || output.modelId}** — context: ${output.contextLength || 'N/A'} tokens.`
    };
  })
  .build();
