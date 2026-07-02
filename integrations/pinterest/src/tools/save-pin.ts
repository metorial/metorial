import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let savePin = SlateTool.create(spec, {
  name: 'Save Pin',
  key: 'save_pin',
  description: `Save an existing Pinterest Pin to a board or board section owned by the authenticated user. Use this to repin public or accessible Pins into an organized board.`,
  instructions: [
    'Provide the source pinId and destination boardId.',
    'Optionally provide boardSectionId to save into a section.',
    'Optionally provide adAccountId when saving on behalf of an ad account owner via Business Access.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      pinId: z.string().describe('ID of the Pin to save'),
      boardId: z.string().describe('Destination board ID'),
      boardSectionId: z.string().optional().describe('Destination board section ID'),
      adAccountId: z
        .string()
        .optional()
        .describe('Ad account ID for Business Access operation user context')
    })
  )
  .output(
    z.object({
      pinId: z.string().describe('ID of the saved Pin copy'),
      title: z.string().optional().describe('Title of the saved Pin'),
      description: z.string().optional().describe('Description of the saved Pin'),
      link: z.string().optional().describe('Destination link of the saved Pin'),
      boardId: z.string().optional().describe('Destination board ID'),
      boardSectionId: z.string().optional().describe('Destination board section ID'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      parentPinId: z.string().optional().describe('Original Pin ID when returned by Pinterest')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.savePin(ctx.input.pinId, {
      boardId: ctx.input.boardId,
      boardSectionId: ctx.input.boardSectionId,
      adAccountId: ctx.input.adAccountId
    });

    return {
      output: {
        pinId: result.id,
        title: result.title,
        description: result.description,
        link: result.link,
        boardId: result.board_id,
        boardSectionId: result.board_section_id,
        createdAt: result.created_at,
        parentPinId: result.parent_pin_id
      },
      message: `Saved pin **${ctx.input.pinId}** to board ${result.board_id}.`
    };
  })
  .build();
