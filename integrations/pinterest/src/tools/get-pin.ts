import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPin = SlateTool.create(spec, {
  name: 'Get Pin',
  key: 'get_pin',
  description: `Retrieve details of a specific Pin by its ID. Returns the pin's metadata including title, description, media, board info, and metrics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pinId: z.string().describe('ID of the pin to retrieve'),
      adAccountId: z.string().optional().describe('Ad account ID for cross-account pin access')
    })
  )
  .output(
    z.object({
      pinId: z.string().describe('ID of the pin'),
      title: z.string().optional().describe('Title of the pin'),
      description: z.string().optional().describe('Description of the pin'),
      link: z.string().optional().describe('Destination link of the pin'),
      altText: z.string().optional().describe('Alt text of the pin image'),
      boardId: z.string().optional().describe('ID of the board this pin belongs to'),
      boardSectionId: z.string().optional().describe('ID of the board section'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      dominantColor: z.string().optional().describe('Dominant color of the pin image'),
      media: z.any().optional().describe('Media information including images and URLs'),
      creativeType: z.string().optional().describe('Type of pin creative'),
      parentPinId: z.string().optional().describe('ID of the parent pin if this is a repin'),
      pinMetrics: z.any().optional().describe('Pin performance metrics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getPin(ctx.input.pinId, ctx.input.adAccountId);

    return {
      output: {
        pinId: result.id,
        title: result.title,
        description: result.description,
        link: result.link,
        altText: result.alt_text,
        boardId: result.board_id,
        boardSectionId: result.board_section_id,
        createdAt: result.created_at,
        dominantColor: result.dominant_color,
        media: result.media,
        creativeType: result.creative_type,
        parentPinId: result.parent_pin_id,
        pinMetrics: result.pin_metrics
      },
      message: `Retrieved pin **${result.title || result.id}**.`
    };
  })
  .build();
