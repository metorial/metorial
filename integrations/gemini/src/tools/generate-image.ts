import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { geminiServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let isImagenModel = (model: string) => /(^|\/)imagen-/i.test(model);

export let generateImage = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Generate or edit images using Gemini's native image generation capabilities or Imagen models. Supports text-to-image generation and image editing with text prompts. Returns generated images as base64-encoded data.`,
  instructions: [
    'Use native image models like "gemini-2.5-flash-image" or Imagen models like "imagen-4.0-generate-001".',
    'Set responseMimeType to "image/png" or "image/jpeg" for the desired output format.',
    'For image editing, use a native Gemini image model and provide an existing image via referenceImageBase64 along with your text prompt describing the desired changes.'
  ],
  constraints: [
    'Image generation capabilities vary by model. Not all models support image output.',
    'Generated images are subject to safety filters and content policies.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe(
          'Model ID for image generation (e.g. "gemini-2.5-flash-image", "imagen-4.0-generate-001")'
        ),
      prompt: z
        .string()
        .describe('Text prompt describing the image to generate or edits to make'),
      referenceImageBase64: z
        .string()
        .optional()
        .describe('Base64-encoded reference image for editing tasks'),
      referenceImageMimeType: z
        .string()
        .optional()
        .describe('MIME type of the reference image (e.g. "image/png", "image/jpeg")'),
      responseMimeType: z
        .enum(['image/png', 'image/jpeg'])
        .optional()
        .describe('Desired output image format'),
      numberOfImages: z
        .number()
        .min(1)
        .max(4)
        .optional()
        .describe('Number of images to generate'),
      aspectRatio: z
        .string()
        .optional()
        .describe('Aspect ratio (e.g. "1:1", "16:9", "4:3", "3:4", "9:16")'),
      imageSize: z
        .enum(['512', '1K', '2K', '4K'])
        .optional()
        .describe('Generated image size for models that support it'),
      personGeneration: z
        .enum(['dont_allow', 'allow_adult', 'allow_all'])
        .optional()
        .describe('Imagen person generation policy'),
      negativePrompt: z
        .string()
        .optional()
        .describe('Deprecated; current Gemini image generation APIs do not support this field')
    })
  )
  .output(
    z.object({
      images: z
        .array(
          z.object({
            base64Data: z.string().describe('Base64-encoded image data'),
            mimeType: z.string().describe('MIME type of the generated image')
          })
        )
        .describe('Generated images')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.referenceImageBase64 && !ctx.input.referenceImageMimeType) {
      throw geminiServiceError(
        'referenceImageMimeType is required when referenceImageBase64 is provided.'
      );
    }

    if (ctx.input.negativePrompt) {
      throw geminiServiceError(
        'negativePrompt is not supported by the current Gemini image generation APIs.'
      );
    }

    if (isImagenModel(ctx.input.model)) {
      if (ctx.input.referenceImageBase64) {
        throw geminiServiceError(
          'Reference image editing is only supported for native Gemini image models.'
        );
      }

      let result = await client.generateImagenImages(ctx.input.model, {
        prompt: ctx.input.prompt,
        numberOfImages: ctx.input.numberOfImages,
        aspectRatio: ctx.input.aspectRatio,
        imageSize: ctx.input.imageSize,
        personGeneration: ctx.input.personGeneration
      });

      let images = (result.predictions ?? [])
        .map((prediction: any) => {
          let image = prediction.image ?? prediction;
          let base64Data =
            image.bytesBase64Encoded ?? image.imageBytes ?? image.bytes_base64_encoded;
          if (!base64Data) return null;

          return {
            base64Data,
            mimeType:
              image.mimeType ?? image.mime_type ?? ctx.input.responseMimeType ?? 'image/png'
          };
        })
        .filter(Boolean);

      return {
        output: { images },
        message: `Generated ${images.length} image(s) using **${ctx.input.model}**.`
      };
    }

    let parts: any[] = [{ text: ctx.input.prompt }];

    if (ctx.input.referenceImageBase64 && ctx.input.referenceImageMimeType) {
      parts.unshift({
        inlineData: {
          mimeType: ctx.input.referenceImageMimeType,
          data: ctx.input.referenceImageBase64
        }
      });
    }

    let generationConfig: Record<string, any> = {};
    if (ctx.input.responseMimeType)
      generationConfig.responseMimeType = ctx.input.responseMimeType;
    generationConfig.responseModalities = ['IMAGE'];
    if (ctx.input.numberOfImages) generationConfig.candidateCount = ctx.input.numberOfImages;
    if (ctx.input.aspectRatio || ctx.input.imageSize) {
      generationConfig.imageConfig = {};
      if (ctx.input.aspectRatio)
        generationConfig.imageConfig.aspectRatio = ctx.input.aspectRatio;
      if (ctx.input.imageSize) generationConfig.imageConfig.imageSize = ctx.input.imageSize;
    }

    let result = await client.generateContent(ctx.input.model, {
      contents: [{ role: 'user', parts }],
      generationConfig: Object.keys(generationConfig).length > 0 ? generationConfig : undefined
    });

    let images: Array<{ base64Data: string; mimeType: string }> = [];

    for (let candidate of result.candidates ?? []) {
      for (let part of candidate.content?.parts ?? []) {
        let inlineData = part.inlineData ?? part.inline_data;
        if (inlineData) {
          images.push({
            base64Data: inlineData.data,
            mimeType: inlineData.mimeType ?? inlineData.mime_type ?? 'image/png'
          });
        }
      }
    }

    return {
      output: { images },
      message: `Generated ${images.length} image(s) using **${ctx.input.model}**.`
    };
  })
  .build();
