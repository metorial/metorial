import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { CreateClient, record, text } from '../lib/client';
import { attachUrl } from '../lib/files';
import { spec } from '../spec';

export let generateAssetTool = SlateTool.create(spec, {
  name: 'Generate AI Asset',
  key: 'generate_ai_asset',
  description: `Generate images, videos, speech, or text using built-in or third-party AI providers.

**Built-in Shotstack providers:**
- **text-to-speech**: Generate speech audio from text with multiple voices and languages.
- **text-to-image**: Generate images from text prompts.
- **image-to-video**: Convert still images into videos.
- **text-generator**: Generate text content powered by GPT-4.

**Third-party providers** (require API keys configured in the Shotstack dashboard):
- **elevenlabs**: Realistic text-to-speech.
- **d-id**: Talking avatar generation from text.
- **stability-ai**: Image generation using Stable Diffusion engines.
- **heygen**: Avatar video generation.`,
  instructions: [
    'Provider options vary by provider and type. Refer to the Shotstack API docs for the full list of available options.',
    'For Shotstack text-to-speech, required options: text, voice. Optional: language, newscaster.',
    'For Shotstack text-to-image, required options: prompt, width, height (width/height must be multiples of 64).',
    'For Shotstack image-to-video, required options: imageUrl (1024x576, 576x1024, or 768x768 PNG/JPG).',
    'For Shotstack text-generator, required options: prompt.',
    'Third-party providers require their API keys configured in the Shotstack dashboard.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      provider: z
        .enum(['shotstack', 'elevenlabs', 'd-id', 'stability-ai', 'heygen'])
        .describe('AI provider to use'),
      options: z
        .record(z.string(), z.any())
        .describe(
          'Provider-specific generation options (e.g. type, text, prompt, voice, imageUrl)'
        )
    })
  )
  .output(
    z.object({
      generatedAssetId: z.string().describe('ID of the generated asset job'),
      status: z.string().describe('Generation status'),
      created: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CreateClient(ctx.auth.token, ctx.config.environment);
    let result = await client.generateAsset(ctx.input.provider, ctx.input.options);

    let attrs = record(result.data.attributes, 'generated asset attributes');

    return {
      output: {
        generatedAssetId: text(result.data.id ?? attrs.id, 'generated asset ID'),
        status: text(attrs.status, 'generation status'),
        created: attrs.created
      },
      message: `AI asset generation queued with ID **${text(result.data.id ?? attrs.id, 'generated asset ID')}**. Use "Get Generated Asset" to check progress.`
    };
  })
  .build();

export let getGeneratedAssetTool = SlateTool.create(spec, {
  name: 'Get Generated Asset',
  key: 'get_generated_asset',
  description: `Check the status of an AI-generated asset. When complete, returns the output URL for the generated image, video, speech, or text.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      generatedAssetId: z.string().describe('The generated asset ID to check')
    })
  )
  .output(
    z.object({
      generatedAssetId: z.string().describe('Asset ID'),
      provider: z.string().optional().describe('AI provider used'),
      type: z
        .string()
        .optional()
        .describe('Generation type (e.g. text-to-speech, text-to-image)'),
      status: z.enum(['queued', 'processing', 'done', 'failed']).describe('Generation status'),
      url: z.string().optional().describe('Output URL (available when status is done)'),
      created: z.string().optional().describe('Creation timestamp'),
      updated: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CreateClient(ctx.auth.token, ctx.config.environment);
    let result = await client.getGeneratedAsset(ctx.input.generatedAssetId);

    let attrs = record(result.data.attributes, 'generated asset attributes');
    if (!['queued', 'processing', 'done', 'failed'].includes(attrs.status))
      throw createApiServiceError(
        `Shotstack returned generation status "${attrs.status}", which this tool does not support yet. Check the asset again later.`
      );
    if (attrs.status === 'done' && typeof attrs.url === 'string')
      await attachUrl(ctx, attrs.url);

    return {
      output: {
        generatedAssetId: text(result.data.id ?? attrs.id, 'generated asset ID'),
        provider: attrs.provider,
        type: attrs.type,
        status: attrs.status,
        url: attrs.url,
        created: attrs.created,
        updated: attrs.updated
      },
      message: `Generated asset **${result.data?.id}** is **${attrs.status}**${attrs.url ? `. URL: ${attrs.url}` : '.'}`
    };
  })
  .build();
