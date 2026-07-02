import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let resizeSchema = z
  .object({
    strategy: z
      .enum(['exact', 'portrait', 'landscape', 'auto', 'crop', 'square', 'fit', 'fill'])
      .describe(
        'Resize strategy. "exact" ignores aspect ratio. "portrait" sets exact height. "landscape" sets exact width. "auto" picks portrait or landscape. "crop" extracts exact dimensions. "square" crops to square. "fit" crops and resizes to fit. "fill" maintains aspect ratio and fills unused space.'
      ),
    width: z.number().optional().describe('Target width in pixels'),
    height: z.number().optional().describe('Target height in pixels'),
    enhance: z
      .boolean()
      .optional()
      .describe('Improve sharpness when downsizing significantly'),
    cropMode: z
      .string()
      .optional()
      .describe(
        'Crop direction: n, s, e, w, c, nw, ne, sw, se (or t, b, l, r, tl, tr, bl, br). Defaults to center.'
      ),
    background: z
      .string()
      .optional()
      .describe('Background color for fill strategy (HEX, RGB, or RGBA)')
  })
  .optional()
  .describe('Resize the image before optimization');

let convertSchema = z
  .object({
    format: z.enum(['jpeg', 'png', 'gif', 'webp', 'avif']).describe('Target image format'),
    background: z
      .string()
      .optional()
      .describe(
        'Background color when converting transparent formats to opaque (HEX, RGB, or RGBA). Defaults to white.'
      ),
    keepExtension: z
      .boolean()
      .optional()
      .describe('Keep the original file extension after conversion')
  })
  .optional()
  .describe('Convert image to a different format');

let s3StoreSchema = z
  .object({
    accessKey: z.string().describe('Amazon S3 Access Key ID'),
    secretKey: z.string().describe('Amazon S3 Secret Access Key'),
    bucket: z.string().describe('S3 bucket name'),
    region: z.string().optional().describe('S3 region (required if not us-east-1)'),
    path: z.string().optional().describe('Destination path in the bucket'),
    acl: z
      .enum(['public_read', 'private'])
      .optional()
      .describe('Object ACL permissions. Defaults to public_read.')
  })
  .optional()
  .describe('Store optimized image directly to Amazon S3');

export let optimizeImageTool = SlateTool.create(spec, {
  name: 'Optimize Image',
  key: 'optimize_image',
  description: `Optimize and compress an image from a URL. Supports lossy and lossless compression, resizing with multiple strategies, format conversion, metadata preservation, and auto-orientation. Optionally store the result directly to Amazon S3.
The optimized image URL is available for **one hour** only.`,
  instructions: [
    'Provide a publicly accessible image URL to optimize.',
    'Use lossy mode for maximum compression. Lossless is the default.',
    'Custom quality (1-100) overrides the default lossy algorithm.',
    'When using a callback URL, the API returns immediately and POSTs results to the URL when done.'
  ],
  constraints: [
    'Supported formats: JPG, PNG, WebP, GIF, SVG, AVIF, HEIC, PDF.',
    'Optimized images are available on Kraken.io servers for one hour only.',
    'Images resized with portrait, landscape, or auto strategies will never be enlarged.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      imageUrl: z.string().describe('Publicly accessible URL of the image to optimize'),
      lossy: z
        .boolean()
        .optional()
        .describe('Enable lossy optimization for maximum compression. Default is lossless.'),
      quality: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe(
          'Custom quality level (1-100) for lossy compression. Overrides default lossy settings.'
        ),
      samplingScheme: z
        .enum(['4:2:0', '4:2:2', '4:4:4'])
        .optional()
        .describe(
          'Chroma subsampling scheme for JPEG compression. "4:2:0" is default and smallest. "4:4:4" preserves maximum quality.'
        ),
      resize: resizeSchema,
      convert: convertSchema,
      preserveMeta: z
        .array(z.enum(['date', 'copyright', 'geotag', 'orientation', 'profile']))
        .optional()
        .describe('Metadata types to preserve. By default all metadata is stripped.'),
      autoOrient: z
        .boolean()
        .optional()
        .describe('Automatically correct image orientation based on EXIF data'),
      s3Store: s3StoreSchema,
      callbackUrl: z
        .string()
        .optional()
        .describe(
          'URL to receive optimization results via POST when processing completes. If provided, the API returns immediately.'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the optimization was successful'),
      fileName: z.string().optional().describe('Name of the optimized file'),
      originalSize: z.number().optional().describe('Original file size in bytes'),
      optimizedSize: z.number().optional().describe('Optimized file size in bytes'),
      savedBytes: z.number().optional().describe('Number of bytes saved'),
      optimizedUrl: z
        .string()
        .optional()
        .describe('URL to download the optimized image (available for 1 hour)'),
      originalWidth: z.number().optional().describe('Original image width in pixels'),
      originalHeight: z.number().optional().describe('Original image height in pixels'),
      optimizedWidth: z.number().optional().describe('Optimized image width in pixels'),
      optimizedHeight: z.number().optional().describe('Optimized image height in pixels'),
      requestId: z
        .string()
        .optional()
        .describe('Request ID returned when using callback URL mode'),
      errorMessage: z.string().optional().describe('Error message if optimization failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret,
      sandbox: ctx.config.sandbox
    });

    let resizeOptions = ctx.input.resize
      ? ({
          strategy: ctx.input.resize.strategy,
          ...(ctx.input.resize.width !== undefined && { width: ctx.input.resize.width }),
          ...(ctx.input.resize.height !== undefined && { height: ctx.input.resize.height }),
          ...(ctx.input.resize.enhance !== undefined && { enhance: ctx.input.resize.enhance }),
          ...(ctx.input.resize.cropMode && { crop_mode: ctx.input.resize.cropMode }),
          ...(ctx.input.resize.background && { background: ctx.input.resize.background })
        } as const)
      : undefined;

    let convertOptions = ctx.input.convert
      ? {
          format: ctx.input.convert.format,
          ...(ctx.input.convert.background && { background: ctx.input.convert.background }),
          ...(ctx.input.convert.keepExtension !== undefined && {
            keep_extension: ctx.input.convert.keepExtension
          })
        }
      : undefined;

    let s3Options = ctx.input.s3Store
      ? ({
          key: ctx.input.s3Store.accessKey,
          secret: ctx.input.s3Store.secretKey,
          bucket: ctx.input.s3Store.bucket,
          ...(ctx.input.s3Store.region && { region: ctx.input.s3Store.region }),
          ...(ctx.input.s3Store.path && { path: ctx.input.s3Store.path }),
          ...(ctx.input.s3Store.acl && { acl: ctx.input.s3Store.acl })
        } as const)
      : undefined;

    let result = await client.optimizeFromUrl({
      url: ctx.input.imageUrl,
      lossy: ctx.input.lossy,
      quality: ctx.input.quality,
      samplingScheme: ctx.input.samplingScheme,
      resize: resizeOptions,
      convert: convertOptions,
      preserveMeta: ctx.input.preserveMeta,
      autoOrient: ctx.input.autoOrient,
      s3Store: s3Options,
      callbackUrl: ctx.input.callbackUrl
    });

    if ('id' in result && result.id) {
      return {
        output: {
          success: true,
          requestId: result.id
        },
        message: `Optimization request submitted. Results will be posted to the callback URL. Request ID: \`${result.id}\``
      };
    }

    let optimizeResult = result as {
      success: boolean;
      file_name?: string;
      original_size?: number;
      kraked_size?: number;
      saved_bytes?: number;
      kraked_url?: string;
      original_width?: number;
      original_height?: number;
      kraked_width?: number;
      kraked_height?: number;
      message?: string;
    };

    if (!optimizeResult.success) {
      return {
        output: {
          success: false,
          errorMessage: optimizeResult.message
        },
        message: `Optimization failed: ${optimizeResult.message}`
      };
    }

    let savedPercent =
      optimizeResult.original_size && optimizeResult.saved_bytes
        ? ((optimizeResult.saved_bytes / optimizeResult.original_size) * 100).toFixed(1)
        : '0';

    return {
      output: {
        success: true,
        fileName: optimizeResult.file_name,
        originalSize: optimizeResult.original_size,
        optimizedSize: optimizeResult.kraked_size,
        savedBytes: optimizeResult.saved_bytes,
        optimizedUrl: optimizeResult.kraked_url,
        originalWidth: optimizeResult.original_width,
        originalHeight: optimizeResult.original_height,
        optimizedWidth: optimizeResult.kraked_width,
        optimizedHeight: optimizeResult.kraked_height
      },
      message: `Image optimized successfully. Saved **${savedPercent}%** (${optimizeResult.saved_bytes ?? 0} bytes). Original: ${optimizeResult.original_size} bytes, Optimized: ${optimizeResult.kraked_size} bytes.`
    };
  })
  .build();
