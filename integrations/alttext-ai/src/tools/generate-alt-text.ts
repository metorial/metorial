import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateAltText = SlateTool.create(spec, {
  name: 'Generate Alt Text',
  key: 'generate_alt_text',
  description: `Generate AI-powered alternative text for an image. Provide an image via URL or base64-encoded data and receive descriptive alt text optimized for accessibility and SEO.
Supports 130+ languages, custom SEO keywords, e-commerce product context, configurable writing styles, and optional ChatGPT post-processing.`,
  instructions: [
    'Provide either an image URL or base64-encoded image data, not both.',
    'Use language codes like "en", "fr", "de", "es", etc. for the lang parameter.',
    'When using ChatGPT post-processing, the prompt must include the {{AltText}} macro.'
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
        .describe('Product description for e-commerce images'),
      maxCharacters: z
        .number()
        .optional()
        .describe('Maximum character length for the generated alt text'),
      aiWritingStyle: z
        .enum(['Elaborated', 'Standard', 'Matter-of-fact', 'Concise', 'Terse'])
        .optional()
        .describe('AI writing style/tone for the generated alt text'),
      chatgptPrompt: z
        .string()
        .optional()
        .describe(
          'Custom ChatGPT prompt for post-processing. Must include the {{AltText}} macro.'
        )
    })
  )
  .output(
    z.object({
      imageAssetId: z.string().describe('Unique identifier for the processed image'),
      imageUrl: z.string().describe('URL of the processed image'),
      altText: z.string().describe('Generated alt text for the image'),
      lang: z.string().describe('Language of the generated alt text'),
      status: z.string().describe('Processing status of the image'),
      createdAt: z.string().describe('Timestamp when the image was processed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let ecommerce =
      ctx.input.ecommerceProduct || ctx.input.ecommerceBrand || ctx.input.ecommerceDescription
        ? {
            product: ctx.input.ecommerceProduct,
            brand: ctx.input.ecommerceBrand,
            description: ctx.input.ecommerceDescription
          }
        : undefined;

    ctx.info('Generating alt text for image...');

    let result = await client.createImage({
      imageUrl: ctx.input.imageUrl,
      imageRaw: ctx.input.imageRaw,
      assetId: ctx.input.assetId,
      lang: ctx.input.lang,
      keywords: ctx.input.keywords,
      negativeKeywords: ctx.input.negativeKeywords,
      keywordSource: ctx.input.keywordSource,
      ecommerce,
      maxCharacters: ctx.input.maxCharacters,
      aiWritingStyle: ctx.input.aiWritingStyle,
      chatgptPrompt: ctx.input.chatgptPrompt
    });

    return {
      output: {
        imageAssetId: result.asset_id,
        imageUrl: result.url,
        altText: result.alt_text,
        lang: result.lang,
        status: result.status,
        createdAt: result.created_at
      },
      message: `Generated alt text for image: **"${result.alt_text}"**`
    };
  })
  .build();
