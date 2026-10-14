import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let managePhotoshopImage = SlateTool.create(spec, {
  name: 'Manage Photoshop Image',
  key: 'manage_photoshop_image',
  description: `Retrieve layer details or update layers in a Photoshop-based NiftyImages image. Photoshop images allow multiple variables (text, images) each with their own font/size/color, positioning and text effects.
You can show/hide layers and set colors for text and shape layers based on data source values.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      imageId: z
        .string()
        .describe('Numeric Photoshop image ID, or the image URL returned by List Images.'),
      action: z
        .enum(['get_layers', 'update'])
        .describe('Whether to get layer details or update layers.'),
      layers: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Layer names mapped to text values, booleans (true hides the layer), or objects with provider properties such as TextValue, TextColor, ShapeColor, Hide, or ImageUrl (required for update action).'
        )
    })
  )
  .output(
    z.object({
      layerDetails: z
        .any()
        .optional()
        .describe('Layer details for the Photoshop image (when action is get_layers).'),
      updateResult: z
        .any()
        .optional()
        .describe('Result of the layer update (when action is update).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'get_layers') {
      let layerDetails = await client.getPhotoshopLayers(ctx.input.imageId);
      return {
        output: { layerDetails },
        message: `Retrieved layer details for Photoshop image **${ctx.input.imageId}**.`
      };
    }

    if (!ctx.input.layers) {
      throw createApiServiceError('Layer data is required for the update action.');
    }

    let updateResult = await client.updatePhotoshopImage(ctx.input.imageId, ctx.input.layers);
    return {
      output: { updateResult },
      message: `Successfully updated Photoshop image **${ctx.input.imageId}** layers.`
    };
  })
  .build();
