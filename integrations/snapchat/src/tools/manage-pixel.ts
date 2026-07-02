import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { SnapchatClient } from '../lib/client';
import { snapchatServiceError } from '../lib/errors';
import { spec } from '../spec';

let pixelOutputSchema = z.object({
  pixelId: z.string().describe('Unique pixel ID'),
  adAccountId: z.string().optional().describe('Associated ad account ID'),
  organizationId: z.string().optional().describe('Associated organization ID'),
  name: z.string().optional().describe('Pixel name'),
  status: z.string().optional().describe('Pixel status'),
  pixelJavascript: z.string().optional().describe('Snap Pixel JavaScript snippet'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let toPixelOutput = (pixel: any) => ({
  pixelId: pixel.id,
  adAccountId: pixel.ad_account_id,
  organizationId: pixel.organization_id,
  name: pixel.name,
  status: pixel.status,
  pixelJavascript: pixel.pixel_javascript,
  createdAt: pixel.created_at,
  updatedAt: pixel.updated_at
});

export let managePixel = SlateTool.create(spec, {
  name: 'Manage Pixel',
  key: 'manage_pixel',
  description: `List, retrieve, or update Snap Pixels for a Snapchat ad account. Snap Pixels are created in Ads Manager; the Marketing API supports reading and updating existing pixels.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      adAccountId: z
        .string()
        .optional()
        .describe('Ad account ID, required for list and update actions'),
      action: z.enum(['list', 'get', 'update']).describe('Action to perform'),
      pixelId: z.string().optional().describe('Pixel ID, required for get and update actions'),
      name: z.string().optional().describe('New pixel name, required when action is update')
    })
  )
  .output(
    z.object({
      pixels: z
        .array(pixelOutputSchema)
        .describe('List of pixels, or one pixel for get/update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnapchatClient(ctx.auth.token);

    if (ctx.input.action === 'list') {
      if (!ctx.input.adAccountId) {
        throw snapchatServiceError('adAccountId is required to list pixels.');
      }

      let results = await client.listPixels(ctx.input.adAccountId);
      let pixels = results.map(toPixelOutput);

      return {
        output: { pixels },
        message: `Found **${pixels.length}** Snap Pixel(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.pixelId) {
        throw snapchatServiceError('pixelId is required to get a pixel.');
      }

      let result = await client.getPixel(ctx.input.pixelId);
      if (!result) {
        throw snapchatServiceError('Snapchat did not return a pixel in the API response.');
      }

      let pixel = toPixelOutput(result);
      return {
        output: { pixels: [pixel] },
        message: `Retrieved Snap Pixel **${pixel.name ?? pixel.pixelId}**.`
      };
    }

    if (!ctx.input.adAccountId) {
      throw snapchatServiceError('adAccountId is required to update a pixel.');
    }
    if (!ctx.input.pixelId) {
      throw snapchatServiceError('pixelId is required to update a pixel.');
    }
    if (!ctx.input.name) {
      throw snapchatServiceError('name is required to update a pixel.');
    }

    let result = await client.updatePixel(ctx.input.adAccountId, {
      id: ctx.input.pixelId,
      name: ctx.input.name
    });

    if (!result) {
      throw snapchatServiceError('Snapchat did not return a pixel in the API response.');
    }

    let pixel = toPixelOutput(result);
    return {
      output: { pixels: [pixel] },
      message: `Updated Snap Pixel **${pixel.name ?? pixel.pixelId}**.`
    };
  })
  .build();
