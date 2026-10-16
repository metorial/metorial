import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let additionalResizeFields = {
  size: z
    .number()
    .optional()
    .describe('Square side length in pixels; use with the square strategy'),
  x: z
    .number()
    .optional()
    .describe('Left coordinate in pixels for a custom crop; also supply y, width, and height'),
  y: z
    .number()
    .optional()
    .describe('Top coordinate in pixels for a custom crop; also supply x, width, and height'),
  scale: z
    .number()
    .optional()
    .describe(
      'Crop scaling percentage; 50 produces half-size dimensions and 100 keeps the crop size'
    )
};

export let s3StoreSchema = z
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
  .describe('Store optimized images directly to Amazon S3');

export let validateAdditionalResize = (resize: {
  strategy: string;
  size?: number;
  x?: number;
  y?: number;
  scale?: number;
  width?: number;
  height?: number;
}) => {
  if (
    resize.size !== undefined &&
    (resize.strategy !== 'square' || !Number.isInteger(resize.size) || resize.size <= 0)
  ) {
    throw createApiServiceError(
      'size must be a positive integer used with the square resize strategy.'
    );
  }
  if (resize.x !== undefined || resize.y !== undefined) {
    if (
      resize.strategy !== 'crop' ||
      [resize.x, resize.y].some(
        value => value === undefined || !Number.isInteger(value) || value < 0
      ) ||
      [resize.width, resize.height].some(
        value => value === undefined || !Number.isInteger(value) || value <= 0
      )
    ) {
      throw createApiServiceError(
        'A custom crop requires strategy crop, non-negative integer x and y, and positive integer width and height.'
      );
    }
  }
  if (resize.scale !== undefined) {
    let scale = resize.scale;
    if (resize.strategy !== 'crop' || !Number.isFinite(scale) || scale <= 0) {
      throw createApiServiceError(
        'scale must be a positive percentage used with the crop resize strategy.'
      );
    }
    if (
      [resize.width, resize.height].some(
        value => value !== undefined && (value * scale) / 100 > 16384
      )
    ) {
      throw createApiServiceError('The scaled crop dimensions must not exceed 16384 pixels.');
    }
  }
};
