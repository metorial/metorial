import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let enhanceImage = SlateTool.create(spec, {
  name: 'Enhance Image',
  key: 'enhance_image',
  description: `Enhance and upscale an image using AI. Applies denoising, deblurring, sharpening, lighting correction, color adjustment, white balance, face enhancement, and exposure correction.
Can also upscale images to a target resolution (up to 4x) or by percentage. Supports generative upscaling for AI-powered resolution increase.
Optionally apply a preset profile (e.g. e-commerce, real estate) instead of manually configuring enhancements.`,
  instructions: [
    'Provide the image as a URL or base64-encoded string in the imageUrl field.',
    'Use enhancements array to select which improvements to apply. Available: denoise, deblur, light, color, white_balance, exposure_correction, clean, face_enhance.',
    'Set width/height as pixels (number) or percentage string (e.g. "200%") to upscale.',
    'Use a preset to apply pre-configured enhancement profiles instead of manual configuration.'
  ],
  constraints: [
    'Maximum upscale factor is 4x of the original resolution.',
    'Generative upscale generates at max 2048x2048 then uses standard AI upscaling beyond that.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      imageUrl: z.string().describe('URL or base64-encoded image to enhance'),
      width: z
        .union([z.number(), z.string()])
        .optional()
        .describe('Target width in pixels or percentage (e.g. "200%")'),
      height: z
        .union([z.number(), z.string()])
        .optional()
        .describe('Target height in pixels or percentage (e.g. "200%")'),
      minLength: z.number().optional().describe('Minimum pixel length for width or height'),
      enhancements: z
        .array(
          z.enum([
            'denoise',
            'deblur',
            'light',
            'color',
            'white_balance',
            'exposure_correction',
            'clean',
            'face_enhance'
          ])
        )
        .optional()
        .describe('Enhancement types to apply'),
      denoiseModel: z
        .enum(['v1', 'v2'])
        .optional()
        .describe('Denoise model version. v2 handles heavily noisy images better'),
      deblurModel: z
        .enum(['v1', 'v2'])
        .optional()
        .describe('Deblur model version. v2 handles heavily blurry images better'),
      lightType: z
        .enum(['contrast', 'hdr_light', 'hdr_light_advanced'])
        .optional()
        .describe('Lighting enhancement algorithm'),
      lightLevel: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Lighting enhancement intensity (0-1)'),
      colorType: z
        .enum(['contrast', 'hdr_light', 'hdr_light_advanced'])
        .optional()
        .describe('Color enhancement algorithm'),
      colorLevel: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Color enhancement intensity (0-1)'),
      whiteBalanceLevel: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('White balance correction level (0-1)'),
      faceEnhanceType: z
        .enum(['beautify-real', 'beautify'])
        .optional()
        .describe('Face enhancement algorithm. beautify-real processes at 2048x2048'),
      faceEnhanceLevel: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Face enhancement intensity (0-1)'),
      faceEnhanceSmoothingLevel: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Additional skin smoothing (0-1)'),
      generativeUpscale: z
        .boolean()
        .optional()
        .describe('Enable AI-powered generative upscaling'),
      upscaleType: z
        .enum(['v1', 'text_x4'])
        .optional()
        .describe('Upscale algorithm. text_x4 is optimized for text-containing images'),
      outputFormat: z.enum(['jpg', 'png', 'webp']).optional().describe('Output image format'),
      outputQuality: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Output image quality (1-100)'),
      preset: z
        .enum(['auto_enhance', 'ecommerce', 'real_estate', 'print_photo', 'digital_art'])
        .optional()
        .describe('Pre-configured enhancement preset to use instead of manual configuration')
    })
  )
  .output(
    z.object({
      status: z
        .string()
        .describe('Processing status: complete, received, in_progress, or not_started'),
      jobId: z.string().describe('Job identifier for tracking or polling'),
      resultUrl: z
        .string()
        .optional()
        .describe('URL to the processed image when status is complete')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.processImageSync({
      url: ctx.input.imageUrl,
      width: ctx.input.width,
      height: ctx.input.height,
      minLength: ctx.input.minLength,
      enhancements: ctx.input.enhancements,
      denoiseParameters: ctx.input.denoiseModel ? { type: ctx.input.denoiseModel } : undefined,
      deblurParameters: ctx.input.deblurModel ? { type: ctx.input.deblurModel } : undefined,
      lightParameters:
        ctx.input.lightType || ctx.input.lightLevel !== undefined
          ? {
              type: ctx.input.lightType,
              level: ctx.input.lightLevel
            }
          : undefined,
      colorParameters:
        ctx.input.colorType || ctx.input.colorLevel !== undefined
          ? {
              type: ctx.input.colorType,
              level: ctx.input.colorLevel
            }
          : undefined,
      whiteBalanceParameters:
        ctx.input.whiteBalanceLevel !== undefined
          ? {
              level: ctx.input.whiteBalanceLevel
            }
          : undefined,
      faceEnhanceParameters:
        ctx.input.faceEnhanceType || ctx.input.faceEnhanceLevel !== undefined
          ? {
              type: ctx.input.faceEnhanceType,
              level: ctx.input.faceEnhanceLevel,
              smoothingLevel: ctx.input.faceEnhanceSmoothingLevel
            }
          : undefined,
      generativeUpscale: ctx.input.generativeUpscale,
      upscaleParameters: ctx.input.upscaleType ? { type: ctx.input.upscaleType } : undefined,
      outputFormat: ctx.input.outputFormat,
      outputQuality: ctx.input.outputQuality,
      preset: ctx.input.preset
    });

    let message =
      result.status === 'complete'
        ? `Image enhanced successfully. Result: ${result.resultUrl}`
        : `Image processing started (status: **${result.status}**). Job ID: \`${result.jobId}\`. Poll for results using the job ID.`;

    return {
      output: result,
      message
    };
  })
  .build();
