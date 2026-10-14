import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, parseCost } from '../lib/client';
import { spec } from '../spec';

export let analyzeImages = SlateTool.create(spec, {
  name: 'Analyze Images',
  key: 'analyze_images',
  description:
    'Analyze images, extract visible text, compare images, or answer visual questions using a vision-capable AI model.',
  instructions: [
    'Call discover_models with type vision or subtype multimodal to find a suitable model.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      model: z.string().describe('Vision-capable model identifier from discover_models'),
      prompt: z
        .string()
        .describe('Question, extraction instructions, or comparison to perform'),
      images: z
        .array(
          z.object({
            url: z
              .string()
              .describe('Public image URL or data:image/...;base64,... image data URL'),
            detail: z
              .enum(['auto', 'low', 'high'])
              .optional()
              .describe('Image analysis detail level when supported by the model')
          })
        )
        .describe('Images to analyze; multiple-image support depends on the model'),
      provider: z
        .string()
        .optional()
        .describe('Specific provider; omit for automatic selection'),
      maxTokens: z.number().optional().describe('Maximum output token count')
    })
  )
  .output(
    z.object({
      completionId: z.string().describe('Completion identifier'),
      model: z.string().describe('Model used for visual analysis'),
      provider: z.string().optional().describe('Provider that served the request'),
      content: z.string().nullable().describe('Generated visual analysis or extracted text'),
      finishReason: z.string().nullable().describe('Reason generation stopped'),
      promptTokens: z.number().describe('Prompt tokens including image processing'),
      completionTokens: z.number().describe('Generated output tokens'),
      totalTokens: z.number().describe('Total tokens used'),
      cost: z.number().optional().describe('Request cost in USD'),
      latencyMs: z.number().optional().describe('Response latency in milliseconds')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.images.length === 0) {
      throw createApiServiceError('Provide at least one image to analyze.');
    }
    let result = await createClient(ctx).chatCompletion({
      model: ctx.input.model,
      provider: ctx.input.provider,
      maxTokens: ctx.input.maxTokens,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: ctx.input.prompt },
            ...ctx.input.images.map(image => ({
              type: 'image_url',
              image_url: { url: image.url, ...(image.detail ? { detail: image.detail } : {}) }
            }))
          ]
        }
      ]
    });
    return {
      output: {
        completionId: result.id,
        model: result.model,
        provider: result.provider,
        content: result.choices?.[0]?.message?.content ?? null,
        finishReason: result.choices?.[0]?.finish_reason ?? null,
        promptTokens: result.usage?.prompt_tokens ?? 0,
        completionTokens: result.usage?.completion_tokens ?? 0,
        totalTokens: result.usage?.total_tokens ?? 0,
        cost: parseCost(result.usage?.cost),
        latencyMs: result.usage?.latency_ms
      },
      message: `Analyzed **${ctx.input.images.length}** image(s) using **${result.model}**.`
    };
  })
  .build();
