import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listImages = SlateTool.create(spec, {
  name: 'List Images',
  key: 'list_images',
  description: `Page through all images in your NiftyImages account, or retrieve details for a specific image. Includes personalized images, countdown timers, and other dynamic content.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      imageId: z
        .string()
        .optional()
        .describe(
          'If provided, retrieves details for this specific image. Otherwise lists images with pagination.'
        ),
      page: z
        .number()
        .optional()
        .describe('Page number for pagination (when listing images).'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of images per page (when listing images).')
    })
  )
  .output(
    z.object({
      images: z.any().optional().describe('Paginated list of images (when listing).'),
      imageDetails: z
        .any()
        .optional()
        .describe('Details of a specific image (when imageId is provided).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.imageId) {
      let imageDetails = await client.getImageDetails(ctx.input.imageId);
      return {
        output: { imageDetails },
        message: `Retrieved details for image **${ctx.input.imageId}**.`
      };
    }

    let images = await client.listImages({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: { images },
      message: `Retrieved images list${ctx.input.page ? ` (page ${ctx.input.page})` : ''}.`
    };
  })
  .build();
