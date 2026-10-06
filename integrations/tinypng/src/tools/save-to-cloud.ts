import { SlateTool } from 'slates';
import { z } from 'zod';
import { type StoreOptions, TinifyClient } from '../lib/client';
import { validateOptions } from '../lib/validation';
import { spec } from '../spec';

let s3ConfigSchema = z.object({
  service: z.literal('s3').describe('Cloud storage service'),
  awsAccessKeyId: z.string().describe('AWS access key ID'),
  awsSecretAccessKey: z.string().describe('AWS secret access key'),
  region: z.string().describe('AWS region, e.g. "us-west-1"'),
  path: z.string().describe('Target path in format "bucket-name/path/filename.ext"'),
  acl: z
    .string()
    .optional()
    .describe('S3 object canned ACL or "no-acl"; omitted follows Tinify defaults')
});

let gcsConfigSchema = z.object({
  service: z.literal('gcs').describe('Cloud storage service'),
  gcpAccessToken: z.string().describe('Google Cloud Platform access token'),
  path: z.string().describe('Target path in format "bucket-name/path/filename.ext"')
});

let resizeSchema = z
  .object({
    method: z.enum(['scale', 'fit', 'cover', 'thumb']).describe('Resize method'),
    width: z.number().optional().describe('Target width in pixels'),
    height: z.number().optional().describe('Target height in pixels')
  })
  .optional()
  .describe('Optional resize parameters to apply before storing');

export let saveToCloud = SlateTool.create(spec, {
  name: 'Save to Cloud Storage',
  key: 'save_to_cloud',
  description: `Compress an image and save it directly to Amazon S3 or Google Cloud Storage. Combines compression with cloud upload in a single operation. Optionally resize, convert format, and preserve metadata before uploading. Supports the documented Cache-Control storage header. Existing target objects can be overwritten; usage and cloud effects are retained.`,
  instructions: [
    'The path should include the bucket name followed by the object key, e.g. "my-bucket/images/photo.jpg".',
    'For S3, provide AWS credentials with appropriate write permissions to the target bucket.',
    'For GCS, provide a valid GCP access token with storage write permissions.'
  ],
  constraints: [
    'Each cloud storage upload counts as an additional compression.',
    'Resize and format conversion each count as additional compressions.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceUrl: z
        .string()
        .describe('Publicly accessible URL of the image to compress and store'),
      storage: z
        .discriminatedUnion('service', [s3ConfigSchema, gcsConfigSchema])
        .describe('Cloud storage destination configuration'),
      cacheControl: z
        .string()
        .optional()
        .describe('Cache-Control header value, e.g. "public, max-age=31536000"'),
      resize: resizeSchema,
      convertTo: z
        .string()
        .optional()
        .describe('Target image format MIME type for conversion, e.g. "image/webp"'),
      background: z
        .string()
        .optional()
        .describe(
          'Background color when converting transparent images. Hex value or "white"/"black".'
        ),
      preserve: z
        .array(z.enum(['copyright', 'creation', 'location']))
        .optional()
        .describe('Metadata to preserve')
    })
  )
  .output(
    z.object({
      inputSize: z.number().optional().describe('Original image size in bytes'),
      inputType: z.string().optional().describe('Original image MIME type'),
      storageUrl: z
        .string()
        .optional()
        .describe('Provider storage receipt URL; accessibility depends on the bucket and ACL'),
      compressionCount: z.number().optional().describe('Total compressions used this month')
    })
  )
  .handleInvocation(async ctx => {
    let storageHeaders: Record<string, string> = {};
    if (ctx.input.cacheControl !== undefined) {
      storageHeaders['Cache-Control'] = ctx.input.cacheControl;
    }

    let storeOptions: StoreOptions;
    if (ctx.input.storage.service === 's3') {
      storeOptions = {
        service: 's3' as const,
        awsAccessKeyId: ctx.input.storage.awsAccessKeyId,
        awsSecretAccessKey: ctx.input.storage.awsSecretAccessKey,
        region: ctx.input.storage.region,
        path: ctx.input.storage.path,
        acl: ctx.input.storage.acl,
        headers: Object.keys(storageHeaders).length > 0 ? storageHeaders : undefined
      };
    } else {
      storeOptions = {
        service: 'gcs' as const,
        gcpAccessToken: ctx.input.storage.gcpAccessToken,
        path: ctx.input.storage.path,
        headers: Object.keys(storageHeaders).length > 0 ? storageHeaders : undefined
      };
    }

    let convertOptions =
      ctx.input.convertTo !== undefined
        ? {
            type: ctx.input.convertTo,
            background: ctx.input.background
          }
        : undefined;

    validateOptions({
      store: storeOptions,
      resize: ctx.input.resize,
      convert: convertOptions,
      background: ctx.input.background,
      preserve: ctx.input.preserve
    });
    const cloudSecrets =
      storeOptions.service === 's3'
        ? [storeOptions.awsAccessKeyId, storeOptions.awsSecretAccessKey]
        : [storeOptions.gcpAccessToken];
    let client = new TinifyClient(ctx.auth.token, cloudSecrets);
    let compressResult = await client.compressFromUrl(ctx.input.sourceUrl);

    ctx.info(
      `Uploading to ${ctx.input.storage.service === 's3' ? 'Amazon S3' : 'Google Cloud Storage'}...`
    );
    let storeResult = await client.storeToCloud(compressResult.outputUrl, storeOptions, {
      resize: ctx.input.resize
        ? {
            method: ctx.input.resize.method,
            width: ctx.input.resize.width,
            height: ctx.input.resize.height
          }
        : undefined,
      convert: convertOptions,
      preserve: ctx.input.preserve
    });

    let serviceName =
      ctx.input.storage.service === 's3' ? 'Amazon S3' : 'Google Cloud Storage';

    return {
      output: {
        inputSize: compressResult.inputSize,
        inputType: compressResult.inputType,
        storageUrl: storeResult.storageUrl,
        compressionCount: storeResult.compressionCount
      },
      message: `Compressed and uploaded image to **${serviceName}** at the requested target. Usage and cloud storage effects remain in effect.`
    };
  })
  .build();
