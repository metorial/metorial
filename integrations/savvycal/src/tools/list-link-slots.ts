import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLinkSlotsTool = SlateTool.create(spec, {
  name: 'List Available Link Slots',
  key: 'list_link_slots',
  description:
    'List available booking slots for a SavvyCal scheduling link. Returns start and end times, duration, and availability rank for use with create_event.',
  instructions: [
    'Call list_links to discover a scheduling link ID.',
    'Use the returned startAt and endAt together when calling create_event.',
    'Rank 1 is preferred availability. Each higher rank includes the lower-rank times; select slots at the desired rank.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      linkId: z.string().describe('Scheduling link ID. Call list_links to discover link IDs.')
    })
  )
  .output(
    z.object({
      linkId: z.string().describe('Scheduling link identifier'),
      slots: z.array(
        z.object({
          startAt: z.string().describe('Available slot start time in ISO 8601 format'),
          endAt: z.string().describe('Available slot end time in ISO 8601 format'),
          duration: z.number().describe('Slot duration in minutes'),
          rank: z.number().describe('Availability preference rank; 1 is most preferred')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getLinkSlots(ctx.input.linkId);
    let slots = data.map(
      (slot: { start_at: string; end_at: string; duration: number; rank: number }) => ({
        startAt: slot.start_at,
        endAt: slot.end_at,
        duration: slot.duration,
        rank: slot.rank
      })
    );

    return {
      output: { linkId: ctx.input.linkId, slots },
      message: `Found **${slots.length}** available booking slot(s).`
    };
  })
  .build();
