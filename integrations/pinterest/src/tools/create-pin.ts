import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pinterestServiceError } from '../lib/errors';
import { spec } from '../spec';

let mediaSourceSchema = z
  .object({
    sourceType: z
      .enum([
        'image_url',
        'image_base64',
        'video_id',
        'multiple_image_urls',
        'multiple_image_base64',
        'pin_url'
      ])
      .describe(
        'Type of media source. Use "image_url" for an image URL, "image_base64" for Base64 image data, "video_id" for uploaded video media, "multiple_image_urls" or "multiple_image_base64" for carousel pins, or "pin_url" for product pins where supported.'
      ),
    url: z
      .string()
      .optional()
      .describe('URL of the image (required for image_url source type)'),
    contentType: z
      .enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
      .optional()
      .describe('MIME type of Base64 image data'),
    data: z.string().optional().describe('Base64 image data for image_base64 source type'),
    mediaId: z
      .string()
      .optional()
      .describe('Media ID for video pins (required for video_id source type)'),
    coverImageUrl: z.string().optional().describe('Cover image URL for video pins'),
    coverImageData: z.string().optional().describe('Base64 cover image data for video pins'),
    coverImageContentType: z.string().optional().describe('MIME type of the cover image data'),
    coverImageKeyFrameTime: z
      .number()
      .optional()
      .describe('Video keyframe timestamp in seconds to use as the cover image'),
    index: z.number().optional().describe('Carousel item index to use as the first item'),
    isAffiliateLink: z
      .boolean()
      .optional()
      .describe('Whether the Pin URL source is an affiliate or sponsored product link'),
    isStandard: z
      .boolean()
      .optional()
      .describe('Whether to create a standard Pin where supported'),
    items: z
      .array(
        z.object({
          title: z.string().optional().describe('Title for this carousel item'),
          description: z.string().optional().describe('Description for this carousel item'),
          link: z.string().optional().describe('Link URL for this carousel item'),
          url: z.string().optional().describe('URL of the item image'),
          data: z.string().optional().describe('Base64 image data for this item'),
          contentType: z
            .enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
            .optional()
            .describe('MIME type for Base64 item image data')
        })
      )
      .optional()
      .describe(
        'Items for carousel/multi-image pins (required for multiple_image_urls source type)'
      )
  })
  .describe('Media source configuration for the pin');

export let createPin = SlateTool.create(spec, {
  name: 'Create Pin',
  key: 'create_pin',
  description: `Create a new Pin on Pinterest. Supports image pins (via URL), video pins, and carousel pins with multiple images. The pin will be saved to the specified board.`,
  instructions: [
    'For image pins, set sourceType to "image_url" and provide the image URL.',
    'For video pins, set sourceType to "video_id" and provide the mediaId from a previous video upload.',
    'For carousel pins, set sourceType to "multiple_image_urls" and provide items array with at least 2 images.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board to save the pin to'),
      boardSectionId: z
        .string()
        .optional()
        .describe('ID of the board section to save the pin to'),
      title: z.string().optional().describe('Title of the pin (max 100 characters)'),
      description: z
        .string()
        .optional()
        .describe('Description of the pin (max 800 characters)'),
      link: z.string().optional().describe('Destination link URL when the pin is clicked'),
      altText: z
        .string()
        .optional()
        .describe('Alt text for the pin image (max 500 characters)'),
      note: z.string().optional().describe('Pin note'),
      mediaSource: mediaSourceSchema
    })
  )
  .output(
    z.object({
      pinId: z.string().describe('ID of the created pin'),
      title: z.string().optional().describe('Title of the pin'),
      description: z.string().optional().describe('Description of the pin'),
      link: z.string().optional().describe('Destination link of the pin'),
      boardId: z.string().optional().describe('ID of the board'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      creativeType: z
        .string()
        .optional()
        .describe('Type of pin creative (e.g., IMAGE, VIDEO, CAROUSEL)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let mediaSource = ctx.input.mediaSource;

    if (mediaSource.sourceType === 'image_url' && !mediaSource.url) {
      throw pinterestServiceError('mediaSource.url is required for image_url pins');
    }

    if (
      mediaSource.sourceType === 'image_base64' &&
      (!mediaSource.data || !mediaSource.contentType)
    ) {
      throw pinterestServiceError(
        'mediaSource.data and mediaSource.contentType are required for image_base64 pins'
      );
    }

    if (mediaSource.sourceType === 'video_id' && !mediaSource.mediaId) {
      throw pinterestServiceError('mediaSource.mediaId is required for video_id pins');
    }

    if (
      mediaSource.sourceType === 'multiple_image_urls' &&
      (!mediaSource.items ||
        mediaSource.items.length < 2 ||
        mediaSource.items.some(item => !item.url))
    ) {
      throw pinterestServiceError(
        'At least two mediaSource.items with url are required for multiple_image_urls pins'
      );
    }

    if (
      mediaSource.sourceType === 'multiple_image_base64' &&
      (!mediaSource.items ||
        mediaSource.items.length < 2 ||
        mediaSource.items.some(item => !item.data || !item.contentType))
    ) {
      throw pinterestServiceError(
        'At least two mediaSource.items with data and contentType are required for multiple_image_base64 pins'
      );
    }

    let result = await client.createPin({
      boardId: ctx.input.boardId,
      boardSectionId: ctx.input.boardSectionId,
      title: ctx.input.title,
      description: ctx.input.description,
      link: ctx.input.link,
      altText: ctx.input.altText,
      note: ctx.input.note,
      mediaSource
    });

    return {
      output: {
        pinId: result.id,
        title: result.title,
        description: result.description,
        link: result.link,
        boardId: result.board_id,
        createdAt: result.created_at,
        creativeType: result.creative_type
      },
      message: `Created pin **${result.title || result.id}** on board ${result.board_id}.`
    };
  })
  .build();
