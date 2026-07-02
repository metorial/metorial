import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newPin = SlateTrigger.create(spec, {
  name: 'New Pin',
  key: 'new_pin',
  description:
    'Triggers when a new pin is created by the authenticated user. Polls for recently created pins and detects new ones since the last check.'
})
  .input(
    z.object({
      pinId: z.string().describe('ID of the pin'),
      title: z.string().optional().describe('Title of the pin'),
      description: z.string().optional().describe('Description of the pin'),
      link: z.string().optional().describe('Destination link'),
      boardId: z.string().optional().describe('Board ID the pin belongs to'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      creativeType: z.string().optional().describe('Creative type'),
      media: z.any().optional().describe('Media information'),
      altText: z.string().optional().describe('Alt text')
    })
  )
  .output(
    z.object({
      pinId: z.string().describe('ID of the new pin'),
      title: z.string().optional().describe('Title of the pin'),
      description: z.string().optional().describe('Description of the pin'),
      link: z.string().optional().describe('Destination link URL'),
      boardId: z.string().optional().describe('ID of the board this pin belongs to'),
      createdAt: z.string().optional().describe('Timestamp when the pin was created'),
      creativeType: z
        .string()
        .optional()
        .describe('Type of pin creative (IMAGE, VIDEO, etc.)'),
      media: z.any().optional().describe('Media information including image URLs'),
      altText: z.string().optional().describe('Alt text for the pin image')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.listPins({
        pageSize: 50
      });

      let knownPinIds: string[] = ctx.state?.knownPinIds || [];
      let allPinIds: string[] = [];
      let newPins: any[] = [];

      for (let pin of result.items || []) {
        allPinIds.push(pin.id);
        if (knownPinIds.length > 0 && !knownPinIds.includes(pin.id)) {
          newPins.push(pin);
        }
      }

      // On first run, store known pin IDs but don't emit events
      if (knownPinIds.length === 0) {
        return {
          inputs: [],
          updatedState: {
            knownPinIds: allPinIds
          }
        };
      }

      return {
        inputs: newPins.map(pin => ({
          pinId: pin.id,
          title: pin.title,
          description: pin.description,
          link: pin.link,
          boardId: pin.board_id,
          createdAt: pin.created_at,
          creativeType: pin.creative_type,
          media: pin.media,
          altText: pin.alt_text
        })),
        updatedState: {
          knownPinIds: allPinIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'pin.created',
        id: ctx.input.pinId,
        output: {
          pinId: ctx.input.pinId,
          title: ctx.input.title,
          description: ctx.input.description,
          link: ctx.input.link,
          boardId: ctx.input.boardId,
          createdAt: ctx.input.createdAt,
          creativeType: ctx.input.creativeType,
          media: ctx.input.media,
          altText: ctx.input.altText
        }
      };
    }
  })
  .build();
