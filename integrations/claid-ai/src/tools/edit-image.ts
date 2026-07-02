import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let restorationSchema = z
  .object({
    upscale: z
      .enum(['smart_enhance', 'smart_resize', 'faces', 'digital_art', 'photo'])
      .optional()
      .describe('AI upscaling mode'),
    decompress: z
      .enum(['moderate', 'strong', 'auto'])
      .optional()
      .describe('Remove JPEG compression artifacts'),
    polish: z.boolean().optional().describe('Apply AI polish to enhance overall image quality')
  })
  .optional()
  .describe('AI restoration operations');

let adjustmentsSchema = z
  .object({
    hdr: z.number().min(0).max(100).optional().describe('HDR intensity (0-100)'),
    exposure: z
      .number()
      .min(-100)
      .max(100)
      .optional()
      .describe('Exposure adjustment (-100 to 100)'),
    saturation: z
      .number()
      .min(-100)
      .max(100)
      .optional()
      .describe('Saturation adjustment (-100 to 100)'),
    contrast: z
      .number()
      .min(-100)
      .max(100)
      .optional()
      .describe('Contrast adjustment (-100 to 100)'),
    sharpness: z.number().min(0).max(100).optional().describe('Sharpness (0-100)')
  })
  .optional()
  .describe('Color and lighting adjustments');

let backgroundSchema = z
  .object({
    remove: z
      .union([
        z.boolean(),
        z.object({
          category: z.enum(['general', 'cars', 'products']).optional(),
          clipping: z.boolean().optional()
        })
      ])
      .optional()
      .describe('Remove background. Pass true for auto-detection or an object with category.'),
    blur: z
      .union([
        z.boolean(),
        z.object({
          type: z.enum(['regular', 'lens']).optional(),
          level: z.enum(['low', 'medium', 'high']).optional(),
          category: z.enum(['general', 'cars', 'products']).optional()
        })
      ])
      .optional()
      .describe('Blur background. Pass true for defaults or an object with options.'),
    color: z
      .string()
      .optional()
      .describe('Set background to a solid hex color (e.g. "#FFFFFF") or "transparent"')
  })
  .optional()
  .describe('Background manipulation');

let resizingSchema = z
  .object({
    width: z
      .union([z.number(), z.string()])
      .optional()
      .describe('Target width in pixels, percentage (e.g. "150%"), or "auto"'),
    height: z
      .union([z.number(), z.string()])
      .optional()
      .describe('Target height in pixels, percentage (e.g. "150%"), or "auto"'),
    fit: z
      .enum(['bounds', 'cover', 'canvas', 'outpaint', 'crop'])
      .optional()
      .describe('Resize fit mode')
  })
  .optional()
  .describe('Resize dimensions and fit mode');

let privacySchema = z
  .object({
    blurCarPlate: z.boolean().optional().describe('Blur license plates for privacy compliance')
  })
  .optional()
  .describe('Privacy features');

let generativeSchema = z
  .object({
    styleTransfer: z
      .object({
        referenceUrl: z.string().optional().describe('URL of the style reference image'),
        prompt: z.string().optional().describe('Text prompt to guide style transfer'),
        depth: z.number().optional().describe('Depth strength control'),
        denoising: z.number().optional().describe('Denoising strength'),
        styleStrength: z.number().optional().describe('Style transfer strength')
      })
      .optional()
      .describe('Apply generative style transfer from a reference image')
  })
  .optional()
  .describe('Generative AI operations');

let outputSchema = z
  .object({
    format: z
      .enum(['jpeg', 'png', 'webp', 'avif', 'tiff'])
      .optional()
      .describe('Output image format'),
    quality: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe('Output quality (1-100, for lossy formats)'),
    destination: z
      .string()
      .optional()
      .describe('Storage URI destination (e.g. "storage://my-bucket/output/image.jpg")'),
    dpi: z.number().optional().describe('DPI metadata for print workflows'),
    colorSpace: z.enum(['RGB', 'CMYK', 'GRAY']).optional().describe('Output color space')
  })
  .optional()
  .describe('Output configuration');

export let editImage = SlateTool.create(spec, {
  name: 'Edit Image',
  key: 'edit_image',
  description: `Process and enhance images using AI-powered editing operations. Combine multiple operations in a single request including AI upscaling, background removal/replacement, color adjustments, resizing, privacy features, and style transfer.

Provide the source image as a public URL or storage URI and specify the desired operations. Results are returned as temporary URLs (24h lifespan) or saved to a connected storage destination.`,
  instructions: [
    'Input can be a public HTTP(S) URL or a storage URI like "storage://storage-name/path/image.png".',
    'Multiple operations can be combined in a single request.',
    'If no output destination is specified, a temporary URL with 24-hour lifespan is returned.'
  ],
  constraints: ['Supported input formats: BMP, GIF, JPEG, PNG, TIFF, WEBP, AVIF, HEIC.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      imageUrl: z.string().describe('Source image URL or storage URI'),
      restorations: restorationSchema,
      adjustments: adjustmentsSchema,
      background: backgroundSchema,
      resizing: resizingSchema,
      padding: z
        .string()
        .optional()
        .describe('Padding as percentage (e.g. "10%") or dual values (e.g. "5% 10%")'),
      privacy: privacySchema,
      generative: generativeSchema,
      output: outputSchema,
      async: z
        .boolean()
        .optional()
        .describe('If true, process asynchronously and return a task ID for polling')
    })
  )
  .output(
    z.object({
      taskId: z.number().optional().describe('Async task ID (only for async requests)'),
      status: z.string().optional().describe('Processing status (only for async requests)'),
      resultUrl: z.string().optional().describe('URL to poll for async results'),
      inputMetadata: z
        .object({
          format: z.string().optional(),
          width: z.number().optional(),
          height: z.number().optional(),
          mps: z.number().optional()
        })
        .optional()
        .describe('Metadata about the input image'),
      outputMetadata: z
        .object({
          format: z.string().optional(),
          width: z.number().optional(),
          height: z.number().optional(),
          mps: z.number().optional(),
          temporaryUrl: z.string().optional(),
          storageUri: z.string().optional()
        })
        .optional()
        .describe('Metadata and URL of the processed image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let operations: Record<string, unknown> = {};

    if (ctx.input.restorations) {
      operations.restorations = ctx.input.restorations;
    }
    if (ctx.input.adjustments) {
      operations.adjustments = ctx.input.adjustments;
    }
    if (ctx.input.background) {
      operations.background = ctx.input.background;
    }
    if (ctx.input.resizing) {
      operations.resizing = ctx.input.resizing;
    }
    if (ctx.input.padding) {
      operations.padding = ctx.input.padding;
    }
    if (ctx.input.privacy) {
      let privacy: Record<string, unknown> = {};
      if (ctx.input.privacy.blurCarPlate !== undefined) {
        privacy.blur_car_plate = ctx.input.privacy.blurCarPlate;
      }
      operations.privacy = privacy;
    }
    if (ctx.input.generative) {
      let generative: Record<string, unknown> = {};
      if (ctx.input.generative.styleTransfer) {
        let st = ctx.input.generative.styleTransfer;
        let styleTransfer: Record<string, unknown> = {};
        if (st.referenceUrl) styleTransfer.reference_url = st.referenceUrl;
        if (st.prompt) styleTransfer.prompt = st.prompt;
        if (st.depth !== undefined) styleTransfer.depth = st.depth;
        if (st.denoising !== undefined) styleTransfer.denoising = st.denoising;
        if (st.styleStrength !== undefined) styleTransfer.style_strength = st.styleStrength;
        generative.style_transfer = styleTransfer;
      }
      operations.generative = generative;
    }

    let outputConfig: Record<string, unknown> | undefined;
    if (ctx.input.output) {
      outputConfig = {};
      if (ctx.input.output.format) outputConfig.format = ctx.input.output.format;
      if (ctx.input.output.quality) outputConfig.quality = ctx.input.output.quality;
      if (ctx.input.output.destination)
        outputConfig.destination = ctx.input.output.destination;
      if (ctx.input.output.colorSpace) outputConfig.color_space = ctx.input.output.colorSpace;
      if (ctx.input.output.dpi) outputConfig.metadata = { dpi: ctx.input.output.dpi };
    }

    let requestBody = {
      input: ctx.input.imageUrl,
      operations,
      output: outputConfig
    };

    if (ctx.input.async) {
      ctx.info('Submitting async image edit request');
      let result = await client.editImageAsync(requestBody);
      let data = result.data;

      return {
        output: {
          taskId: data.id,
          status: data.status,
          resultUrl: data.result_url
        },
        message: `Async image edit submitted. Task ID: **${data.id}**, status: **${data.status}**. Poll the result URL to check progress.`
      };
    }

    ctx.info('Processing synchronous image edit');
    let result = await client.editImage(requestBody);
    let data = result.data;

    return {
      output: {
        inputMetadata: data.input
          ? {
              format: data.input.format,
              width: data.input.width,
              height: data.input.height,
              mps: data.input.mps
            }
          : undefined,
        outputMetadata: data.output
          ? {
              format: data.output.format,
              width: data.output.width,
              height: data.output.height,
              mps: data.output.mps,
              temporaryUrl: data.output.tmp_url,
              storageUri: data.output.claid_storage_uri
            }
          : undefined
      },
      message: `Image edited successfully. Output: **${data.output?.width}×${data.output?.height}** ${data.output?.format}. ${data.output?.tmp_url ? `[View result](${data.output.tmp_url})` : ''}`
    };
  })
  .build();
