import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TypeformClient } from '../lib/client';
import { typeformServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageImage = SlateTool.create(spec, {
  name: 'Manage Image',
  key: 'manage_image',
  description: `Upload, retrieve, or delete images in your Typeform account. Images can be used in form fields, backgrounds, and choice options.`,
  instructions: [
    'To **upload**, provide **fileName** and either **base64Image** or **imageUrl** (no imageId).',
    'To **retrieve**, provide just the **imageId**.',
    'To **delete**, set **delete** to true and provide **imageId**.',
    'To **list** all images, leave all fields empty.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      imageId: z.string().optional().describe('Image ID (required for retrieve and delete)'),
      delete: z.boolean().optional().describe('Set to true to delete the image'),
      base64Image: z.string().optional().describe('Base64-encoded image data for upload'),
      mediaType: z
        .string()
        .optional()
        .describe('Deprecated. Typeform infers media type from the image data or URL.'),
      imageUrl: z.string().optional().describe('Public URL of the image to upload'),
      fileName: z.string().optional().describe('File name for the uploaded image')
    })
  )
  .output(
    z.object({
      imageId: z.string().optional().describe('Image ID'),
      src: z.string().optional().describe('Image source URL'),
      fileName: z.string().optional().describe('Image file name'),
      mediaType: z.string().optional().describe('Image media type'),
      deleted: z.boolean().optional().describe('Whether the image was deleted'),
      images: z
        .array(
          z.object({
            imageId: z.string().describe('Image ID'),
            src: z.string().optional().describe('Image source URL'),
            fileName: z.string().optional().describe('Image file name'),
            mediaType: z.string().optional().describe('Image media type')
          })
        )
        .optional()
        .describe('List of all images (when listing)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TypeformClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    // Delete
    if (ctx.input.delete) {
      if (!ctx.input.imageId) {
        throw typeformServiceError('imageId is required when deleting an image.');
      }
      await client.deleteImage(ctx.input.imageId);
      return {
        output: {
          imageId: ctx.input.imageId,
          deleted: true
        },
        message: `Deleted image \`${ctx.input.imageId}\`.`
      };
    }

    // Upload
    if (ctx.input.base64Image || ctx.input.imageUrl || ctx.input.fileName) {
      if (!ctx.input.fileName || (!ctx.input.base64Image && !ctx.input.imageUrl)) {
        throw typeformServiceError(
          'Provide fileName and either base64Image or imageUrl to upload an image.'
        );
      }
      if (ctx.input.base64Image && ctx.input.imageUrl) {
        throw typeformServiceError('Provide either base64Image or imageUrl, not both.');
      }

      let result = await client.createImage({
        image: ctx.input.base64Image,
        url: ctx.input.imageUrl,
        fileName: ctx.input.fileName
      });
      return {
        output: {
          imageId: result.id,
          src: result.src,
          fileName: result.file_name,
          mediaType: result.media_type
        },
        message: `Uploaded image **${ctx.input.fileName}**.`
      };
    }

    // Retrieve single
    if (ctx.input.imageId) {
      let result = await client.getImage(ctx.input.imageId);
      return {
        output: {
          imageId: result.id,
          src: result.src,
          fileName: result.file_name,
          mediaType: result.media_type
        },
        message: `Retrieved image \`${ctx.input.imageId}\`.`
      };
    }

    // List all
    let result = await client.listImages();
    let images = (Array.isArray(result) ? result : []).map((img: any) => ({
      imageId: img.id,
      src: img.src,
      fileName: img.file_name,
      mediaType: img.media_type
    }));

    return {
      output: {
        images
      },
      message: `Found **${images.length}** images.`
    };
  })
  .build();
