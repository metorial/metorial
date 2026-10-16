import { setTimeout as delay } from 'node:timers/promises';
import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { imageSummarySchema, mapImage } from '../lib/schemas';
import { spec } from '../spec';

let generationBudgetMs = 25_000;
let pollIntervalMs = 1_000;

export let generateAltText = SlateTool.create(spec, {
  name: 'Generate Alt Text',
  key: 'generate_alt_text',
  description: `Generate AI-powered alternative text for an image. Provide an image via URL or base64-encoded data and receive descriptive alt text optimized for accessibility and SEO.
Supports 130+ languages, custom SEO keywords, e-commerce product context, configurable writing styles, and optional ChatGPT post-processing.`,
  instructions: [
    'Provide either an image URL or base64-encoded image data, not both.',
    'Use language codes such as "en" or comma-separated codes such as "en,fr,es". Each additional language consumes a translation credit.',
    'When using ChatGPT post-processing, the prompt must include the {{AltText}} macro.',
    'If processing remains pending, use get_image with the actual imageAssetId reported in the error. Do not resubmit the image.'
  ],
  constraints: [
    'Images must be less than 16MB and at least 50x50 pixels.',
    'Standard formats (JPG, PNG, GIF, WebP, BMP) use 1 credit. Advanced formats (AVIF, HEIC, HEIF, JP2, SVG, TIFF) use 2 credits.',
    'Up to 6 keywords and 6 negative keywords are supported.',
    'Keyword source text is limited to 1024 characters.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      imageUrl: z
        .string()
        .optional()
        .describe('Publicly accessible URL of the image to process'),
      imageRaw: z.string().optional().describe('Base64-encoded image data'),
      assetId: z
        .string()
        .optional()
        .describe(
          'Custom identifier for the image, used to track it in your system. If omitted, a random ID is assigned.'
        ),
      lang: z
        .string()
        .optional()
        .describe(
          'Language code for the generated alt text (e.g. "en", "fr", "de"). Defaults to account setting.'
        ),
      keywords: z
        .array(z.string())
        .optional()
        .describe('SEO keywords to include in the generated alt text (max 6)'),
      negativeKeywords: z
        .array(z.string())
        .optional()
        .describe('Keywords to exclude from the generated alt text (max 6)'),
      keywordSource: z
        .string()
        .optional()
        .describe(
          'Context text used to derive keywords if none are explicitly provided (max 1024 chars)'
        ),
      ecommerceProduct: z.string().optional().describe('Product name for e-commerce images'),
      ecommerceBrand: z.string().optional().describe('Brand name for e-commerce images'),
      ecommerceDescription: z
        .string()
        .optional()
        .describe(
          'Product description used as keyword source context; combined with keywordSource when both are supplied (12–1024 characters total).'
        ),
      maxCharacters: z
        .number()
        .optional()
        .describe('Maximum character length for the generated alt text'),
      aiWritingStyle: z
        .enum(['Elaborated', 'Standard', 'Matter-of-fact', 'Concise', 'Terse'])
        .optional()
        .describe('AI writing style/tone for the generated alt text'),
      ecommerceColor: z
        .string()
        .optional()
        .describe('Product color; requires ecommerceProduct'),
      overwrite: z
        .boolean()
        .optional()
        .describe('Regenerate alt text for an existing URL or asset ID; consumes credits'),
      tags: z.array(z.string()).optional().describe('Tags to associate with the image'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom metadata stored with the image'),
      chatgptPrompt: z
        .string()
        .optional()
        .describe(
          'Custom ChatGPT prompt for post-processing. Must include the {{AltText}} macro.'
        )
    })
  )
  .output(imageSummarySchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info('Generating alt text for image...');

    let controller = new AbortController();
    let timeout = setTimeout(() => controller.abort(), generationBudgetMs);
    let imageAssetId: string | undefined;
    try {
      let result = await client.createImage(ctx.input, controller.signal);
      imageAssetId =
        typeof result?.asset_id === 'string' && result.asset_id ? result.asset_id : undefined;
      if (imageAssetId) {
        while (typeof result.alt_text !== 'string') {
          await delay(pollIntervalMs, undefined, { signal: controller.signal });
          result = await client.getImage(imageAssetId, controller.signal);
          if (result.asset_id !== imageAssetId)
            throw createApiServiceError(
              'AltText.ai returned a different image asset ID during processing.'
            );
        }
      }
      return {
        output: mapImage(result),
        message: `Generated alt text for image: **"${result.alt_text}"**`
      };
    } catch (cause) {
      if (!imageAssetId) throw cause;
      let data =
        isApiErrorRecord(cause) && isApiErrorRecord(cause.data) ? cause.data : undefined;
      let detail =
        typeof data?.message === 'string'
          ? data.message
          : cause instanceof Error
            ? cause.message
            : undefined;
      let error = createApiServiceError(
        `AltText.ai accepted image ${JSON.stringify(imageAssetId)}, but ${controller.signal.aborted ? 'the 25-second generation time limit was reached' : 'a complete result could not be retrieved'}.${detail ? ` ${detail}` : ''} Call get_image with imageAssetId ${JSON.stringify(imageAssetId)} to check the existing image. Do not submit the image again.`,
        {
          reason: controller.signal.aborted
            ? 'alttext_ai_generation_pending'
            : 'alttext_ai_generation_lookup_failed',
          parent: cause,
          upstreamStatus:
            typeof data?.upstreamStatus === 'number' ||
            typeof data?.upstreamStatus === 'string'
              ? data.upstreamStatus
              : undefined,
          upstreamCode: typeof data?.upstreamCode === 'string' ? data.upstreamCode : undefined
        }
      );
      error.data.imageAssetId = imageAssetId;
      error.data.recoveryTool = 'get_image';
      if (detail) error.data.lookupError = detail;
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  })
  .build();
