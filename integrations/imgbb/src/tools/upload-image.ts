import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadImage = SlateTool.create(spec, {
  name: 'Upload Image',
  key: 'upload_image',
  description: `Upload an image to ImgBB and receive publicly accessible hosted URLs. Supports base64-encoded image data or a URL pointing to an image. Returns the hosted image URL, a viewer page URL, a display URL, a thumbnail URL, and a delete URL.`,
  constraints: [
    'Maximum file size is 32 MB.',
    'Supported formats: JPG, PNG, BMP, GIF.',
    'Expiration must be between 60 and 15,552,000 seconds (60 seconds to 180 days).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      image: z.string().describe('Base64-encoded image data or a URL pointing to an image'),
      name: z
        .string()
        .optional()
        .describe('Custom filename for the uploaded image (without extension)'),
      expiration: z
        .number()
        .min(60)
        .max(15552000)
        .optional()
        .describe('Auto-delete the image after this many seconds (60 to 15,552,000)')
    })
  )
  .output(
    z.object({
      imageId: z.string().describe('Unique identifier for the uploaded image'),
      title: z.string().describe('Title of the uploaded image'),
      viewerUrl: z.string().describe('URL to the ImgBB viewer page for the image'),
      directUrl: z.string().describe('Direct URL to the original uploaded image'),
      displayUrl: z.string().describe('Display URL for the image'),
      thumbnailUrl: z.string().describe('URL to the thumbnail version of the image'),
      mediumUrl: z
        .string()
        .optional()
        .describe('URL to the medium-sized version of the image'),
      deleteUrl: z.string().describe('URL to delete the image'),
      width: z.number().describe('Width of the image in pixels'),
      height: z.number().describe('Height of the image in pixels'),
      sizeBytes: z.number().describe('File size in bytes'),
      expiration: z.number().describe('Expiration time in seconds (0 if no expiration)'),
      mime: z.string().describe('MIME type of the uploaded image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Uploading image to ImgBB...');

    let result = await client.uploadImage({
      image: ctx.input.image,
      name: ctx.input.name,
      expiration: ctx.input.expiration
    });

    let output = {
      imageId: result.id,
      title: result.title,
      viewerUrl: result.url_viewer,
      directUrl: result.url,
      displayUrl: result.display_url,
      thumbnailUrl: result.thumb.url,
      mediumUrl: result.medium?.url,
      deleteUrl: result.delete_url,
      width: result.width,
      height: result.height,
      sizeBytes: result.size,
      expiration: result.expiration,
      mime: result.image.mime
    };

    let expirationNote =
      result.expiration > 0
        ? ` The image will auto-expire in ${result.expiration} seconds.`
        : '';

    return {
      output,
      message: `Uploaded **${result.title}** (${result.width}x${result.height}, ${result.image.mime}).${expirationNote}\n\nView: ${result.url_viewer}`
    };
  })
  .build();
