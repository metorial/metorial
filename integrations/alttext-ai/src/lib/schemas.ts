import { createApiServiceError, isApiErrorRecord } from 'slates';
import { z } from 'zod';
import type { ImageResult } from './client';

export let imageSummarySchema = z.object({
  imageAssetId: z.string().describe('Unique identifier for the image'),
  imageUrl: z
    .string()
    .optional()
    .describe('Source URL, absent for raw uploads without a durable URL'),
  altText: z.string().describe('Generated alt text'),
  lang: z
    .string()
    .optional()
    .describe(
      'Language when supplied by the provider or unambiguously identified by altTexts'
    ),
  status: z.string().optional().describe('Processing status, when supplied by the provider'),
  createdAt: z
    .string()
    .describe('Creation timestamp; epoch seconds are represented as a string'),
  altTexts: z
    .record(z.string(), z.string())
    .optional()
    .describe('Alt text keyed by language code'),
  tags: z.array(z.string()).optional().describe('Image tags'),
  metadata: z.record(z.string(), z.unknown()).optional().describe('Custom image metadata'),
  raw: z.record(z.string(), z.unknown()).optional().describe('Complete provider image record')
});

export let imageDetailSchema = imageSummarySchema.extend({
  keywords: z
    .array(z.string())
    .nullable()
    .optional()
    .describe('SEO keywords, when supplied by the provider'),
  negativeKeywords: z
    .array(z.string())
    .nullable()
    .optional()
    .describe('Negative keywords, when supplied by the provider'),
  updatedAt: z
    .string()
    .optional()
    .describe('Last update timestamp, when supplied by the provider')
});

export let mapImage = (image: ImageResult) => {
  if (
    !image ||
    typeof image.asset_id !== 'string' ||
    typeof image.alt_text !== 'string' ||
    !['string', 'number'].includes(typeof image.created_at)
  ) {
    let imageAssetId =
      typeof image?.asset_id === 'string' && image.asset_id ? image.asset_id : undefined;
    let error = createApiServiceError(
      `AltText.ai did not return a complete image result.${imageAssetId ? ` Call get_image with imageAssetId ${JSON.stringify(imageAssetId)} to check processing; do not submit the image again.` : ' The provider did not return a usable asset ID.'}`,
      { reason: 'alttext_ai_invalid_image_response' }
    );
    if (imageAssetId) error.data.imageAssetId = imageAssetId;
    throw error;
  }
  let matchingLanguages = Object.entries(image.alt_texts ?? {})
    .filter(([, text]) => text === image.alt_text)
    .map(([lang]) => lang);
  return {
    imageAssetId: image.asset_id,
    imageUrl: image.url ?? undefined,
    altText: image.alt_text,
    lang: image.lang ?? (matchingLanguages.length === 1 ? matchingLanguages[0] : undefined),
    status: image.status,
    createdAt: String(image.created_at),
    keywords: image.keywords,
    negativeKeywords: image.negative_keywords,
    updatedAt: image.updated_at === undefined ? undefined : String(image.updated_at),
    altTexts: image.alt_texts,
    tags:
      Array.isArray(image.tags) && image.tags.every(tag => typeof tag === 'string')
        ? image.tags
        : undefined,
    metadata: isApiErrorRecord(image.metadata) ? image.metadata : undefined,
    raw: image
  };
};
