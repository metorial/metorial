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
        .describe('Background color, image URL, or video URL for the cover'),
      headline: z.string().optional().describe('Headline text displayed on the cover')
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
      headline: ctx.input.headline
    });

    return {
      output: {
        status: result.status ?? 'success',
        cover: result.data
      },
      message: `Cover created successfully${ctx.input.name ? ` with name **${ctx.input.name}**` : ''}.`
    };
  })
  .build();
