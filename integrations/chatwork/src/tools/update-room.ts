import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let iconPresets = z.enum([
  'group',
  'check',
  'document',
  'meeting',
  'event',
  'project',
  'business',
  'study',
  'security',
  'star',
  'idea',
  'heart',
  'magcup',
  'beer',
  'music',
  'sports',
  'travel'
]);

export let updateRoom = SlateTool.create(spec, {
  name: 'Update Room',
  key: 'update_room',
  description: `Updates a chat room's name, description, or icon. Provide only the fields you want to change.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      roomId: z.number().describe('ID of the chat room to update'),
      name: z.string().min(1).max(255).optional().describe('New room name'),
      description: z.string().optional().describe('New room description'),
      iconPreset: iconPresets.optional().describe('New icon preset')
    })
  )
  .output(
    z.object({
      roomId: z.number().describe('ID of the updated room')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let result = await client.updateRoom(ctx.input.roomId, {
      name: ctx.input.name,
      description: ctx.input.description,
      iconPreset: ctx.input.iconPreset
    });

    return {
      output: { roomId: result.room_id },
      message: `Updated room ${result.room_id}.`
    };
  })
  .build();
