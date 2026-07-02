import { SlateTool } from 'slates';
import { z } from 'zod';
import { AbyssaleClient } from '../lib/client';
import { spec } from '../spec';

export let getDesignFormat = SlateTool.create(spec, {
  name: 'Get Design Format',
  key: 'get_design_format',
  description: `Retrieve detailed information about a specific format of a design, including dimensions, preview URL, dynamic image URL, and all customizable elements with their properties. Use this to inspect available elements before generating images.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      designId: z.string().describe('UUID of the design'),
      formatSpecifier: z.string().describe('Format name or UID to retrieve details for')
    })
  )
  .output(
    z.object({
      formatId: z.string().describe('Format identifier'),
      formatUid: z.string().describe('Unique ID for format instance'),
      width: z.number().describe('Format width'),
      height: z.number().describe('Format height'),
      unit: z.string().describe('Measurement unit for dimensions'),
      previewUrl: z.string().describe('Preview image URL'),
      dynamicImageUrl: z.string().describe('Dynamic image URL for this format'),
      elements: z
        .array(z.record(z.string(), z.any()))
        .describe('Customizable design elements with names, types, and properties'),
      variables: z
        .record(z.string(), z.any())
        .describe('Text layer variables as key-value pairs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbyssaleClient({ token: ctx.auth.token });

    let format = await client.getDesignFormatDetails(
      ctx.input.designId,
      ctx.input.formatSpecifier
    );

    return {
      output: {
        formatId: format.id,
        formatUid: format.uid,
        width: format.width,
        height: format.height,
        unit: format.unit,
        previewUrl: format.preview_url,
        dynamicImageUrl: format.dynamic_image_url,
        elements: format.elements,
        variables: format.variables
      },
      message: `Retrieved format **${format.id}** (${format.width}x${format.height} ${format.unit}) with **${format.elements.length}** customizable element(s).`
    };
  })
  .build();
