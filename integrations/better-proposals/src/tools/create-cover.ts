import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCover = SlateTool.create(spec, {
  name: 'Create Cover',
  key: 'create_cover',
  description: `Creates a custom cover design for proposals. The returned cover ID can be used when creating new proposals.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('A memorable name for the cover'),
      background: z
        .string()
        .optional()
        .describe('Background hex color for the cover, sent unchanged to the provider'),
      headline: z.string().optional().describe('Headline text displayed on the cover'),
      brandId: z
        .string()
        .optional()
        .describe(
          'Brand ID. Call get_settings with brand included to discover the default brand.'
        ),
      subheader: z.string().optional().describe('Subheader text displayed on the cover'),
      textColour: z.string().optional().describe('Hex color for cover text'),
      textAlign: z.string().optional().describe('Cover text alignment, such as left'),
      buttonStyle: z.string().optional().describe('Cover button style, such as round'),
      buttonText: z.string().optional().describe('Text displayed on the cover button')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API'),
      cover: z.any().optional().describe('Created cover data including cover ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createCover({
      name: ctx.input.name,
      background: ctx.input.background,
      headline: ctx.input.headline,
      brandId: ctx.input.brandId,
      subheader: ctx.input.subheader,
      textColour: ctx.input.textColour,
      textAlign: ctx.input.textAlign,
      buttonStyle: ctx.input.buttonStyle,
      buttonText: ctx.input.buttonText
    });

    return {
      output: {
        status: result.status,
        cover: result.data
      },
      message: `Cover created successfully${ctx.input.name ? ` with name **${ctx.input.name}**` : ''}.`
    };
  })
  .build();
