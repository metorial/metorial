import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { downloadOptimizedFile } from '../lib/files';
import {
  additionalResizeFields,
  s3StoreSchema,
  validateAdditionalResize
} from '../lib/schemas';
import type { KrakenImageSetResponse } from '../lib/types';
import { spec } from '../spec';

let sizeItemSchema = z.object({
  ...additionalResizeFields,
  sizeId: z
    .string()
    .describe(
      'Unique identifier for this size variant (e.g., "thumbnail", "medium", "large")'
    ),
  strategy: z
    .enum(['exact', 'portrait', 'landscape', 'auto', 'crop', 'square', 'fit', 'fill', 'none'])
    .describe(
      'Resize strategy. Use "none" to return the optimized original without resizing.'
    ),
  width: z.number().optional().describe('Target width in pixels'),
  height: z.number().optional().describe('Target height in pixels'),
  cropMode: z
    .string()
    .optional()
    .describe('Crop gravity for crop or fit, such as c, n, sw, or br'),
  background: z
    .string()
    .optional()
    .describe('Background color for the fill strategy (HEX, RGB, or RGBA)'),
  enhance: z.boolean().optional().describe('Improve sharpness when downsizing significantly'),
  lossy: z.boolean().optional().describe('Override global lossy setting for this size'),
  quality: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe('Override global quality for this size (1-100)'),
  samplingScheme: z
    .enum(['4:2:0', '4:2:2', '4:4:4'])
    .optional()
    .describe('Override chroma subsampling for this size'),
  storagePath: z
    .string()
    .optional()
    .describe('Override storage path for this size when using external storage')
});

let imageSetResultSchema = z.object({
  sizeId: z.string().describe('Size identifier matching the request'),
  fileName: z.string().describe('Name of the optimized file'),
  originalSize: z.number().describe('Original file size in bytes'),
  optimizedSize: z.number().describe('Optimized file size in bytes'),
  savedBytes: z.number().describe('Bytes saved'),
  optimizedUrl: z.string().describe('URL to download the optimized image'),
  originalWidth: z.number().describe('Original image width in pixels'),
  originalHeight: z.number().describe('Original image height in pixels'),
  optimizedWidth: z.number().describe('Optimized image width in pixels'),
  optimizedHeight: z.number().describe('Optimized image height in pixels'),
  fileDeliveryError: z
    .string()
    .optional()
    .describe('Why this completed variant could not be prepared for download'),
  raw: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Complete provider result for this variant')
});

export let generateImageSetsTool = SlateTool.create(spec, {
  name: 'Generate Image Sets',
  key: 'generate_image_sets',
  description: `Generate multiple resized and optimized versions of a single image in one request. Upload one image and get back up to 10 separate sizes with different resize strategies, quality settings, and dimensions.
Useful for creating responsive image variants (thumbnails, mobile, desktop, retina) from a single source image.`,
  instructions: [
    'Each size must have a unique sizeId.',
    'Each size can override global lossy, quality, and sampling settings independently.',
    'Use strategy "none" to include the optimized original without resizing.'
  ],
  constraints: [
    'Maximum of 10 sizes per request.',
    'Optimized images are available on Kraken.io servers for one hour only.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      imageUrl: z.string().describe('Publicly accessible URL of the source image'),
      sizes: z
        .array(sizeItemSchema)
        .min(1)
        .max(10)
        .describe('Array of size configurations (max 10)'),
      lossy: z
        .boolean()
        .optional()
        .describe('Global lossy optimization setting. Individual sizes can override.'),
      quality: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Global quality setting (1-100). Individual sizes can override.'),
      samplingScheme: z
        .enum(['4:2:0', '4:2:2', '4:4:4'])
        .optional()
        .describe('Global chroma subsampling scheme'),
      convert: z
        .object({
          format: z
            .enum(['jpeg', 'png', 'gif', 'webp', 'avif'])
            .describe('Target image format'),
          background: z
            .string()
            .optional()
            .describe('Background color for transparency handling'),
          keepExtension: z
            .boolean()
            .optional()
            .describe('Keep the original filename extension after conversion')
        })
        .optional()
        .describe('Convert all sizes to a different format'),
      preserveMeta: z
        .array(z.enum(['date', 'copyright', 'geotag', 'orientation', 'profile']))
        .optional()
        .describe('Metadata types to preserve'),
      autoOrient: z
        .boolean()
        .optional()
        .describe('Automatically correct orientation based on EXIF data'),
      s3Store: s3StoreSchema,
      callbackUrl: z
        .string()
        .optional()
        .describe('URL to receive results via POST when processing completes')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      results: z
        .array(imageSetResultSchema)
        .optional()
        .describe('Optimization results for each requested size'),
      requestId: z.string().optional().describe('Request ID when using callback URL mode'),
      errorMessage: z.string().optional().describe('Error message if the operation failed'),
      fileName: z.string().optional().describe('Source filename reported by Kraken.io'),
      timestamp: z.number().optional().describe('Provider result timestamp'),
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Complete image set or callback acknowledgment response')
    })
  )
  .handleInvocation(async ctx => {
    for (let size of ctx.input.sizes) validateAdditionalResize(size);
    if (ctx.input.s3Store && ctx.input.sizes.some(size => !size.storagePath)) {
      throw createApiServiceError(
        'Each size requires storagePath when storing an image set in Amazon S3.'
      );
    }
    let client = new Client({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret,
      sandbox: ctx.config.sandbox
    });

    let sizes = ctx.input.sizes.map(size => ({
      id: size.sizeId,
      strategy: size.strategy,
      ...pickDefined({ size: size.size, x: size.x, y: size.y, scale: size.scale }),
      ...(size.width !== undefined && { width: size.width }),
      ...(size.height !== undefined && { height: size.height }),
      ...(size.cropMode && { crop_mode: size.cropMode }),
      ...(size.background && { background: size.background }),
      ...(size.enhance !== undefined && { enhance: size.enhance }),
      ...(size.lossy !== undefined && { lossy: size.lossy }),
      ...(size.quality !== undefined && { quality: size.quality }),
      ...(size.samplingScheme && { sampling_scheme: size.samplingScheme }),
      ...(size.storagePath && { storage_path: size.storagePath })
    }));

    let convertOptions = ctx.input.convert
      ? {
          format: ctx.input.convert.format,
          ...(ctx.input.convert.background && { background: ctx.input.convert.background }),
          ...(ctx.input.convert.keepExtension !== undefined && {
            keep_extension: ctx.input.convert.keepExtension
          })
        }
      : undefined;

    let result = await client.generateImageSets({
      url: ctx.input.imageUrl,
      lossy: ctx.input.lossy,
      quality: ctx.input.quality,
      samplingScheme: ctx.input.samplingScheme,
      sizes,
      convert: convertOptions,
      preserveMeta: ctx.input.preserveMeta,
      autoOrient: ctx.input.autoOrient,
      s3Store: ctx.input.s3Store
        ? {
            key: ctx.input.s3Store.accessKey,
            secret: ctx.input.s3Store.secretKey,
            bucket: ctx.input.s3Store.bucket,
            ...(ctx.input.s3Store.region && { region: ctx.input.s3Store.region }),
            ...(ctx.input.s3Store.path && { path: ctx.input.s3Store.path }),
            ...(ctx.input.s3Store.acl && { acl: ctx.input.s3Store.acl })
          }
        : undefined,
      callbackUrl: ctx.input.callbackUrl
    });

    if (typeof result.id === 'string' && result.id) {
      return {
        output: {
          success: true,
          requestId: result.id,
          raw: result
        },
        message: `Image set generation request submitted. Results will be posted to the callback URL. Request ID: \`${result.id}\``
      };
    }

    let setResult = result as KrakenImageSetResponse;

    let results: z.infer<typeof imageSetResultSchema>[] = [];
    for (let [sizeId, r] of Object.entries(setResult.results ?? {})) {
      let fileDeliveryError: string | undefined;
      try {
        await ctx.addAttachment({
          type: 'content',
          content: await downloadOptimizedFile(r.kraked_url),
          filename: r.file_name
        });
      } catch {
        fileDeliveryError =
          'The variant was generated, but its file could not be prepared for download. Retrieve optimizedUrl directly; files hosted by Kraken.io are retained for one hour.';
      }
      results.push({
        sizeId,
        fileName: r.file_name,
        originalSize: r.original_size,
        optimizedSize: r.kraked_size,
        savedBytes: r.saved_bytes,
        optimizedUrl: r.kraked_url,
        originalWidth: r.original_width,
        originalHeight: r.original_height,
        optimizedWidth: r.kraked_width,
        optimizedHeight: r.kraked_height,
        fileDeliveryError,
        raw: r
      });
    }
    let failedDownloads = results
      .filter(result => result.fileDeliveryError)
      .map(result => result.sizeId);

    return {
      output: {
        success: true,
        results,
        fileName: typeof setResult.file_name === 'string' ? setResult.file_name : undefined,
        timestamp: setResult.timestamp,
        raw: result
      },
      message: `Generated **${results.length}** image variants successfully.${failedDownloads.length ? ` Files could not be prepared for download for: ${failedDownloads.join(', ')}. Their optimization results and URLs are retained.` : ' The generated files were prepared for download.'}`
    };
  })
  .build();
