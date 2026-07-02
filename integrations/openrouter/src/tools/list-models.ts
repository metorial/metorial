import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let modelSchema = z.object({
  modelId: z.string().describe('Unique model identifier (e.g., "openai/gpt-4o")'),
  canonicalSlug: z.string().optional().describe('Canonical model slug'),
  name: z.string().optional().describe('Human-readable model name'),
  description: z.string().optional().describe('Model description'),
  contextLength: z.number().optional().describe('Maximum context length in tokens'),
  pricing: z
    .object({
      prompt: z.string().optional().describe('Cost per prompt token (in USD)'),
      completion: z.string().optional().describe('Cost per completion token (in USD)'),
      image: z.string().optional().describe('Cost per image token'),
      request: z.string().optional().describe('Cost per request')
    })
    .optional()
    .describe('Pricing information'),
  topProvider: z
    .object({
      contextLength: z.number().optional().describe('Context length for top provider'),
      maxCompletionTokens: z
        .number()
        .optional()
        .describe('Max completion tokens for top provider'),
      isModerated: z
        .boolean()
        .optional()
        .describe('Whether the top provider moderates content')
    })
    .optional()
    .describe('Top provider details'),
  architecture: z
    .object({
      modality: z
        .string()
        .optional()
        .describe('Model modality (e.g., "text->text", "text+image->text")'),
      inputModalities: z.array(z.string()).optional().describe('Supported input modalities'),
      outputModalities: z.array(z.string()).optional().describe('Supported output modalities'),
      tokenizer: z.string().optional().describe('Tokenizer used'),
      instructType: z.string().optional().describe('Instruction type')
    })
    .optional()
    .describe('Model architecture details'),
  supportedParameters: z
    .array(z.string())
    .optional()
    .describe('Supported OpenRouter request parameters')
});

export let normalizeModel = (m: Record<string, unknown>) => {
  let pricing = m.pricing as Record<string, unknown> | undefined;
  let topProvider = m.top_provider as Record<string, unknown> | undefined;
  let architecture = m.architecture as Record<string, unknown> | undefined;

  return {
    modelId: (m.id as string) || '',
    canonicalSlug: (m.canonical_slug as string) || undefined,
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
            inputModalities: (architecture.input_modalities as string[]) || undefined,
            outputModalities: (architecture.output_modalities as string[]) || undefined,
            tokenizer: (architecture.tokenizer as string) || undefined,
            instructType: (architecture.instruct_type as string) || undefined
          }
        }
      : {}),
    supportedParameters: (m.supported_parameters as string[]) || undefined
  };
};

export let listModels = SlateTool.create(spec, {
  name: 'List Models',
  key: 'list_models',
  description: `List all available AI models on OpenRouter with their metadata, pricing, and capabilities. Use to discover models, compare pricing, or find models that support specific features like tool calling.`,
  instructions: [
    'Use the supportedParameters filter to find models with specific capabilities (e.g., "tools" for tool calling, "response_format" for structured outputs).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      supportedParameters: z
        .string()
        .optional()
        .describe(
          'Filter models by supported parameter, comma-separated for multiple values (e.g., "tools,response_format")'
        ),
      category: z
        .string()
        .optional()
        .describe('Filter models by OpenRouter use-case category'),
      outputModalities: z
        .string()
        .optional()
        .describe(
          'Filter by output modalities, comma-separated (text, image, audio, embeddings) or "all"'
        ),
      sort: z
        .enum([
          'pricing-low-to-high',
          'pricing-high-to-low',
          'context-high-to-low',
          'throughput-high-to-low',
          'latency-low-to-high',
          'most-popular',
          'top-weekly',
          'newest'
        ])
        .optional()
        .describe('Server-side sort order for model discovery'),
      userFiltered: z
        .boolean()
        .optional()
        .describe(
          'List models filtered by the authenticated user preferences, privacy settings, and guardrails'
        ),
      search: z
        .string()
        .optional()
        .describe('Search term to filter models by name or ID (client-side filtering)'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of models to return (default: 50)')
    })
  )
  .output(
    z.object({
      models: z.array(modelSchema).describe('List of available models'),
      totalCount: z.number().describe('Total number of models matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      siteUrl: ctx.config.siteUrl,
      appTitle: ctx.config.appTitle
    });

    let rawModels = await client.listModels({
      supportedParameters: ctx.input.supportedParameters,
      category: ctx.input.category,
      outputModalities: ctx.input.outputModalities,
      sort: ctx.input.sort,
      userFiltered: ctx.input.userFiltered
    });

    let models = rawModels.map(normalizeModel);

    // Client-side search filter
    if (ctx.input.search) {
      let searchLower = ctx.input.search.toLowerCase();
      models = models.filter(
        (m: { modelId: string; name?: string }) =>
          m.modelId.toLowerCase().includes(searchLower) ||
          m.name?.toLowerCase().includes(searchLower)
      );
    }

    let totalCount = models.length;
    let maxResults = ctx.input.maxResults || 50;
    models = models.slice(0, maxResults);

    return {
      output: {
        models,
        totalCount
      },
      message: `Found **${totalCount}** model(s)${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}. Showing ${models.length}.`
    };
  })
  .build();
