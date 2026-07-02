import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updatePin = SlateTool.create(spec, {
  name: 'Update Pin',
  key: 'update_pin',
  description: `Update an existing Pin's metadata. Can modify title, description, link, alt text, note, or move the pin to a different board or section.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      pinId: z.string().describe('ID of the pin to update'),
      boardId: z.string().optional().describe('Move pin to this board'),
      boardSectionId: z.string().optional().describe('Move pin to this board section'),
      title: z.string().optional().describe('New title for the pin'),
      description: z.string().optional().describe('New description for the pin'),
      link: z.string().optional().describe('New destination link for the pin'),
      altText: z.string().optional().describe('New alt text for the pin image'),
      note: z.string().optional().describe('New note for the pin')
    })
  )
  .output(
    z.object({
      pinId: z.string().describe('ID of the updated pin'),
      title: z.string().optional().describe('Updated title'),
      description: z.string().optional().describe('Updated description'),
      link: z.string().optional().describe('Updated destination link'),
      boardId: z.string().optional().describe('Board ID'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updatePin(ctx.input.pinId, {
      boardId: ctx.input.boardId,
      boardSectionId: ctx.input.boardSectionId,
      title: ctx.input.title,
      description: ctx.input.description,
      link: ctx.input.link,
      altText: ctx.input.altText,
      note: ctx.input.note
    });

    return {
      output: {
        pinId: result.id,
        title: result.title,
        description: result.description,
        link: result.link,
        boardId: result.board_id,
        createdAt: result.created_at
      },
      message: `Updated pin **${result.title || result.id}**.`
    };
  })
  .build();
