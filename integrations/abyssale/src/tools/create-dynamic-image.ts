import { SlateTool } from 'slates';
import { z } from 'zod';
import { AbyssaleClient } from '../lib/client';
import { spec } from '../spec';

export let createDynamicImage = SlateTool.create(spec, {
  name: 'Create Dynamic Image',
  key: 'create_dynamic_image',
  description: `Create a dynamic image URL for a design. Dynamic images allow real-time customization of visuals via URL parameters — useful for personalized email images, Open Graph images, etc. Only one dynamic image is allowed per design; subsequent calls return the existing one.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      designId: z.string().describe('UUID of the design to create a dynamic image for'),
      enableRateLimit: z
        .boolean()
        .optional()
        .describe('Enable API rate limiting for this dynamic image'),
      enableProductionMode: z
        .boolean()
        .optional()
        .describe('Enable production mode (default is test mode)')
    })
  )
  .output(
    z.object({
      dynamicImageId: z.string().describe('ID of the dynamic image'),
      designId: z.string().describe('ID of the associated design'),
      formats: z
        .array(
          z.object({
            formatId: z.string().describe('Format identifier'),
            formatUid: z.string().describe('Format unique ID'),
            width: z.number().describe('Width in format units'),
            height: z.number().describe('Height in format units'),
            unit: z.string().describe('Measurement unit'),
            dynamicImageUrl: z.string().describe('Dynamic image URL for this format')
          })
        )
        .describe('Available formats with their dynamic image URLs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbyssaleClient({ token: ctx.auth.token });

    let result = await client.createDynamicImage(ctx.input.designId, {
      enableRateLimit: ctx.input.enableRateLimit,
      enableProductionMode: ctx.input.enableProductionMode
    });

    let formats = result.formats.map(f => ({
      formatId: f.id,
      formatUid: f.uid,
      width: f.width,
      height: f.height,
      unit: f.unit,
      dynamicImageUrl: f.dynamic_image_url
    }));

    return {
      output: {
        dynamicImageId: result.id,
        designId: result.design_id,
        formats
      },
      message: `Dynamic image created for design \`${result.design_id}\` with **${formats.length}** format(s). Use the dynamic image URLs to customize visuals via query parameters.`
    };
  })
  .build();
