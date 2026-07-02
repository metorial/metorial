import { SlateTool } from 'slates';
import { z } from 'zod';
import { klaviyoServiceError } from '../lib/errors';
import { createClient, extractPaginationCursor } from '../lib/helpers';
import { spec } from '../spec';

let formatImage = (image: { id?: string; attributes?: Record<string, any> }) => ({
  imageId: image.id ?? '',
  name: image.attributes?.name ?? undefined,
  imageUrl:
    image.attributes?.image_url ??
    image.attributes?.image_full_url ??
    image.attributes?.url ??
    undefined,
  format: image.attributes?.format ?? undefined,
  size: image.attributes?.size ?? undefined,
  hidden: image.attributes?.hidden ?? undefined,
  updatedAt: image.attributes?.updated_at ?? image.attributes?.updated ?? undefined
});

export let manageImages = SlateTool.create(spec, {
  name: 'Manage Images',
  key: 'manage_images',
  description: `List, retrieve, upload from URL or data URI, and update Klaviyo images used in templates and campaigns.
Use upload to import a hosted image or data URI into Klaviyo's image library.`,
  instructions: [
    'Use action "upload" with importUrl set to an HTTPS image URL or data URI.',
    'Use action "update" to rename an image or toggle whether it is hidden in the Klaviyo library.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'upload', 'update']).describe('Action to perform'),
      imageId: z.string().optional().describe('Image ID (required for get and update).'),
      name: z.string().optional().describe('Image name (for upload or update).'),
      importUrl: z
        .string()
        .optional()
        .describe('HTTPS URL or data URI to import (required for upload).'),
      hidden: z.boolean().optional().describe('Whether the image should be hidden.'),
      filter: z.string().optional().describe('Klaviyo filter string for listing images.'),
      sort: z.string().optional().describe('Sort field for listing images.'),
      pageCursor: z
        .string()
        .optional()
        .describe('Pagination cursor from a previous response.'),
      pageSize: z.number().optional().describe('Number of results per page (max 100).')
    })
  )
  .output(
    z.object({
      images: z
        .array(
          z.object({
            imageId: z.string().describe('Image ID'),
            name: z.string().optional().describe('Image name'),
            imageUrl: z.string().optional().describe('Klaviyo-hosted image URL'),
            format: z.string().optional().describe('Image format'),
            size: z.number().optional().describe('Image size in bytes'),
            hidden: z.boolean().optional().describe('Whether the image is hidden'),
            updatedAt: z.string().optional().describe('Last updated timestamp')
          })
        )
        .optional()
        .describe('Images returned by Klaviyo'),
      imageId: z.string().optional().describe('ID of the targeted image'),
      success: z.boolean().describe('Whether the operation succeeded'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, imageId, name, importUrl, hidden, filter, sort, pageCursor, pageSize } =
      ctx.input;

    if (action === 'list') {
      let result = await client.getImages({ filter, sort, pageCursor, pageSize });
      let images = result.data.map(formatImage);
      let nextCursor = extractPaginationCursor(result.links);
      return {
        output: { images, success: true, nextCursor, hasMore: !!nextCursor },
        message: `Retrieved **${images.length}** images${nextCursor ? ' — more results available' : ''}`
      };
    }

    if (action === 'get') {
      if (!imageId) throw klaviyoServiceError('imageId is required for get');
      let result = await client.getImage(imageId);
      let image = Array.isArray(result.data) ? result.data[0] : result.data;
      return {
        output: {
          images: [formatImage(image ?? {})],
          imageId: image?.id ?? imageId,
          success: true
        },
        message: `Retrieved image **${image?.attributes?.name ?? imageId}**`
      };
    }

    if (action === 'upload') {
      if (!importUrl) throw klaviyoServiceError('importUrl is required for upload');
      let result = await client.uploadImage({
        import_from_url: importUrl,
        name,
        hidden
      });
      let image = Array.isArray(result.data) ? result.data[0] : result.data;
      return {
        output: {
          images: [formatImage(image ?? {})],
          imageId: image?.id,
          success: true
        },
        message: `Uploaded image **${image?.attributes?.name ?? name ?? image?.id ?? 'image'}**`
      };
    }

    if (action === 'update') {
      if (!imageId) throw klaviyoServiceError('imageId is required for update');
      if (name === undefined && hidden === undefined) {
        throw klaviyoServiceError('Provide name or hidden to update an image');
      }
      let result = await client.updateImage(imageId, { name, hidden });
      let image = Array.isArray(result.data) ? result.data[0] : result.data;
      return {
        output: {
          images: [formatImage(image ?? {})],
          imageId: image?.id ?? imageId,
          success: true
        },
        message: `Updated image **${imageId}**`
      };
    }

    throw klaviyoServiceError(`Unknown action: ${action}`);
  })
  .build();
