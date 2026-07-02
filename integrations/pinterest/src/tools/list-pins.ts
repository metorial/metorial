import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPins = SlateTool.create(spec, {
  name: 'List Pins',
  key: 'list_pins',
  description: `List pins owned by the authenticated user. Supports pagination and filtering by pin type. Can also list pins on a specific board or board section.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      boardId: z
        .string()
        .optional()
        .describe('If provided, list pins on this specific board instead of all user pins'),
      boardSectionId: z
        .string()
        .optional()
        .describe('If provided along with boardId, list pins in this board section'),
      bookmark: z.string().optional().describe('Pagination bookmark from a previous response'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of pins to return (max 250, default 25)'),
      pinFilter: z
        .enum(['exclude_native', 'exclude_repins', 'has_been_promoted'])
        .optional()
        .describe('Filter to apply on pins'),
      pinType: z
        .enum(['PRIVATE', 'PROTECTED', 'PUBLIC'])
        .optional()
        .describe('Filter by pin privacy type')
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
        .describe('List of pins'),
      bookmark: z.string().optional().describe('Bookmark for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.boardId && ctx.input.boardSectionId) {
      result = await client.listBoardSectionPins(ctx.input.boardId, ctx.input.boardSectionId, {
        bookmark: ctx.input.bookmark,
        pageSize: ctx.input.pageSize
      });
    } else if (ctx.input.boardId) {
      result = await client.listBoardPins(ctx.input.boardId, {
        bookmark: ctx.input.bookmark,
        pageSize: ctx.input.pageSize
      });
    } else {
      result = await client.listPins({
        bookmark: ctx.input.bookmark,
        pageSize: ctx.input.pageSize,
        pinFilter: ctx.input.pinFilter,
        pinType: ctx.input.pinType
      });
    }

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
      message: `Found **${pins.length}** pin(s).${result.bookmark ? ' More results available with bookmark.' : ''}`
    };
  })
  .build();
