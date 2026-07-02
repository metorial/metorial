import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let sizeItemSchema = z.object({
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
  optimizedHeight: z.number().describe('Optimized image height in pixels')
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
            .describe('Background color for transparency handling')
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
      errorMessage: z.string().optional().describe('Error message if the operation failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret,
      sandbox: ctx.config.sandbox
    });

    let sizes = ctx.input.sizes.map(size => ({
      id: size.sizeId,
      strategy: size.strategy,
      ...(size.width !== undefined && { width: size.width }),
      ...(size.height !== undefined && { height: size.height }),
      ...(size.enhance !== undefined && { enhance: size.enhance }),
      ...(size.lossy !== undefined && { lossy: size.lossy }),
      ...(size.quality !== undefined && { quality: size.quality }),
      ...(size.samplingScheme && { sampling_scheme: size.samplingScheme }),
      ...(size.storagePath && { storage_path: size.storagePath })
    }));

    let convertOptions = ctx.input.convert
      ? {
          format: ctx.input.convert.format,
          ...(ctx.input.convert.background && { background: ctx.input.convert.background })
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
      callbackUrl: ctx.input.callbackUrl
    });

    if ('id' in result && result.id) {
      return {
        output: {
          success: true,
          requestId: result.id as string
        },
        message: `Image set generation request submitted. Results will be posted to the callback URL. Request ID: \`${result.id}\``
      };
    }

    let setResult = result as {
      success: boolean;
      results?: Record<
        string,
        {
          file_name: string;
          original_size: number;
          kraked_size: number;
          saved_bytes: number;
          kraked_url: string;
          original_width: number;
          original_height: number;
          kraked_width: number;
          kraked_height: number;
        }
      >;
      message?: string;
    };

    if (!setResult.success) {
      return {
        output: {
          success: false,
          errorMessage: setResult.message
        },
        message: `Image set generation failed: ${setResult.message}`
      };
    }

    let results = Object.entries(setResult.results ?? {}).map(([sizeId, r]) => ({
      sizeId,
      fileName: r.file_name,
      originalSize: r.original_size,
      optimizedSize: r.kraked_size,
      savedBytes: r.saved_bytes,
      optimizedUrl: r.kraked_url,
      originalWidth: r.original_width,
      originalHeight: r.original_height,
      optimizedWidth: r.kraked_width,
      optimizedHeight: r.kraked_height
    }));

    return {
      output: {
        success: true,
        results
      },
      message: `Generated **${results.length}** image variants successfully.`
    };
  })
  .build();
