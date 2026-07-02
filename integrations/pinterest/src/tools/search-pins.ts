import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchPins = SlateTool.create(spec, {
  name: 'Search Pins',
  key: 'search_pins',
  description: `Search for pins by keyword. Returns matching pins from the authenticated user's content. Useful for finding specific pins across boards.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query keywords'),
      bookmark: z.string().optional().describe('Pagination bookmark from a previous response'),
      pageSize: z.number().optional().describe('Number of results to return'),
      adAccountId: z.string().optional().describe('Ad account ID for cross-account pin search')
    })
  )
  .output(
    z.object({
      pins: z
        .array(
          z.object({
            pinId: z.string().describe('ID of the pin'),
            title: z.string().optional().describe('Title of the pin'),
            description: z.string().optional().describe('Description of the pin'),
            link: z.string().optional().describe('Destination link'),
            boardId: z.string().optional().describe('Board ID'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            creativeType: z.string().optional().describe('Creative type'),
            media: z.any().optional().describe('Media information')
          })
        )
        .describe('List of matching pins'),
      bookmark: z.string().optional().describe('Bookmark for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchPins({
      query: ctx.input.query,
      bookmark: ctx.input.bookmark,
      pageSize: ctx.input.pageSize,
      adAccountId: ctx.input.adAccountId
    });

    let pins = (result.items || []).map((pin: any) => ({
      pinId: pin.id,
      title: pin.title,
      description: pin.description,
      link: pin.link,
      boardId: pin.board_id,
      createdAt: pin.created_at,
      creativeType: pin.creative_type,
      media: pin.media
    }));

    return {
      output: {
        pins,
        bookmark: result.bookmark ?? undefined
      },
      message: `Found **${pins.length}** pin(s) matching "${ctx.input.query}".${result.bookmark ? ' More results available with bookmark.' : ''}`
    };
  })
  .build();
