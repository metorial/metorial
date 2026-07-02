import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let discoverModels = SlateTool.create(spec, {
  name: 'Discover Models',
  key: 'discover_models',
  description: `Browse and filter the catalog of available AI models across all providers. Filter by type (language, vision, image, voice, embedding), provider, capabilities, and more. Returns pricing, latency, context window, and availability information for each model.`,
  instructions: [
    'Use type "llm" for language models, "vision" for vision models, "image" for image generators, "voice" for TTS, "embedding" for embedding models.',
    'Use subtype "multimodal" for models that support both text and vision, "pool" for model pools, "tts" for text-to-speech.',
    'Set "voices" to true to list available TTS voices across all providers.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .enum(['llm', 'vision', 'embedding', 'image', 'voice', 'moderation', 'coding', 'free'])
        .optional()
        .describe('Filter by model classification'),
      subtype: z
        .enum([
          'chat',
          'fill-mask',
          'question-answering',
          'tts',
          'stt',
          'multimodal',
          'pool',
          'chatx'
        ])
        .optional()
        .describe('Filter by model category/subtype'),
      provider: z
        .string()
        .optional()
        .describe('Filter by provider (e.g., "openrouter", "openai", "bedrock")'),
      model: z.string().optional().describe('Filter by specific model route (e.g., "gpt-4o")'),
      enabledOnly: z
        .boolean()
        .optional()
        .describe('Set to true to only return active/available models'),
      voices: z
        .boolean()
        .optional()
        .describe('Set to true to list available TTS voices instead of models')
    })
  )
  .output(
    z.object({
      models: z
        .array(
          z.object({
            modelRoute: z.string().describe('Full model route identifier'),
            modelName: z.string().describe('Short model name'),
            type: z.string().describe('Model type classification'),
            subtype: z.string().optional().describe('Model subtype/category'),
            provider: z.string().describe('Provider serving this model'),
            description: z.string().optional().describe('Feature summary'),
            maxTokens: z.number().optional().describe('Maximum context window size'),
            maxResponseTokens: z.number().optional().describe('Maximum response tokens'),
            requestPrice: z.number().optional().describe('Price per token for input/request'),
            responsePrice: z
              .number()
              .optional()
              .describe('Price per token for output/response'),
            priceType: z.string().optional().describe('Pricing unit type'),
            available: z
              .boolean()
              .optional()
              .describe('Whether the model is currently available'),
            enabled: z
              .number()
              .optional()
              .describe('Whether the model is enabled (1) or disabled (0)')
          })
        )
        .describe('List of matching models'),
      totalCount: z.number().describe('Total number of models returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listModels({
      type: ctx.input.type,
      subtype: ctx.input.subtype,
      provider: ctx.input.provider,
      model: ctx.input.model,
      enabled: ctx.input.enabledOnly ? 1 : undefined,
      voices: ctx.input.voices
    });

    let models = (result.data ?? []).map((m: any) => ({
      modelRoute: m.route ?? m.id ?? '',
      modelName: m.model ?? m.id ?? '',
      type: m.type ?? '',
      subtype: m.subtype,
      provider: m.provider ?? '',
      description: m.description,
      maxTokens: m.max_tokens,
      maxResponseTokens: m.max_response_tokens,
      requestPrice: m.req_price,
      responsePrice: m.res_price,
      priceType: m.price_type,
      available: m.available,
      enabled: m.enabled
    }));

    let filterDesc = [
      ctx.input.type ? `type=${ctx.input.type}` : null,
      ctx.input.subtype ? `subtype=${ctx.input.subtype}` : null,
      ctx.input.provider ? `provider=${ctx.input.provider}` : null,
      ctx.input.model ? `model=${ctx.input.model}` : null
    ]
      .filter(Boolean)
      .join(', ');

    return {
      output: {
        models,
        totalCount: models.length
      },
      message: `Found **${models.length}** model${models.length !== 1 ? 's' : ''}${filterDesc ? ` matching filters: ${filterDesc}` : ''}.`
    };
  })
  .build();
