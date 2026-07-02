import { SlateTool } from 'slates';
import { z } from 'zod';
import { VisionClient } from '../lib/client';
import { boundingPolySchema, imageSourceSchema } from '../lib/schemas';
import type { FeatureType } from '../lib/types';
import { googleCloudVisionActionScopes } from '../scopes';
import { spec } from '../spec';

export let detectText = SlateTool.create(spec, {
  name: 'Detect Text (OCR)',
  key: 'detect_text',
  description: `Extracts text from images using optical character recognition (OCR). Supports two modes: standard text detection for photos and general scenes, and document text detection optimized for dense text, documents, and handwriting. Returns the full extracted text along with individual text blocks and their positions.`,
  instructions: [
    'Use **document** mode for scanned documents, dense text, or handwriting recognition.',
    'Use **text** mode (default) for photos, signs, and general scene text.',
    'For handwriting detection, use document mode with languageHints set to ["en-t-i0-handwrit"].'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleCloudVisionActionScopes.detectText)
  .input(
    z.object({
      image: imageSourceSchema,
      mode: z
        .enum(['text', 'document'])
        .optional()
        .describe(
          'OCR mode: "text" for general scenes (default), "document" for dense text and documents'
        ),
      languageHints: z
        .array(z.string())
        .optional()
        .describe(
          'Language hints to assist detection (e.g., ["en", "fr"]). Use "en-t-i0-handwrit" for handwriting.'
        )
    })
  )
  .output(
    z.object({
      fullText: z.string().describe('Complete extracted text from the image'),
      textBlocks: z.array(
        z.object({
          text: z.string().describe('Detected text content'),
          locale: z.string().optional().describe('Detected language code'),
          boundingPoly: boundingPolySchema.describe('Bounding polygon around the text')
        })
      ),
      detectedLanguages: z
        .array(
          z.object({
            languageCode: z.string().describe('Detected language code'),
            confidence: z.number().describe('Detection confidence')
          })
        )
        .optional()
        .describe('Languages detected in the document (document mode only)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VisionClient({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let featureType: FeatureType =
      ctx.input.mode === 'document' ? 'DOCUMENT_TEXT_DETECTION' : 'TEXT_DETECTION';

    let imageContext = ctx.input.languageHints
      ? { languageHints: ctx.input.languageHints }
      : undefined;

    let result = await client.annotateImage(
      ctx.input.image,
      [{ type: featureType }],
      imageContext
    );

    let textAnnotations = result.textAnnotations ?? [];
    let fullTextAnnotation = result.fullTextAnnotation;

    let fullText =
      textAnnotations.length > 0
        ? textAnnotations[0]!.description
        : (fullTextAnnotation?.text ?? '');

    let textBlocks = textAnnotations.slice(1).map(ta => ({
      text: ta.description,
      locale: ta.locale,
      boundingPoly: ta.boundingPoly
    }));

    let detectedLanguages = fullTextAnnotation?.pages?.[0]?.property?.detectedLanguages?.map(
      dl => ({
        languageCode: dl.languageCode,
        confidence: dl.confidence
      })
    );

    return {
      output: {
        fullText,
        textBlocks,
        detectedLanguages
      },
      message: fullText
        ? `Extracted **${fullText.length}** characters of text from the image using ${ctx.input.mode === 'document' ? 'document' : 'standard'} OCR.`
        : 'No text detected in the image.'
    };
  })
  .build();
