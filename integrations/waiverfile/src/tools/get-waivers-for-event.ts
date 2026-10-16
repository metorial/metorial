import { SlateTool } from 'slates';
import { z } from 'zod';
import { WaiverFileClient } from '../lib/client';
import { spec } from '../spec';

export let getWaiversForEvent = SlateTool.create(spec, {
  name: 'Get Waivers for Event',
  key: 'get_waivers_for_event',
  description: `Retrieve all signed waivers associated with a specific event. Useful for checking waiver completion status for event participants.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      waiverEventId: z.string().describe('ID of the event to retrieve waivers for')
    })
  )
  .output(
    z.object({
      waivers: z.any().describe('Complete provider response for the event waivers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaiverFileClient({
      token: ctx.auth.token,
      siteId: ctx.auth.siteId
    });

    let waivers = await client.getWaiversForEvent(ctx.input.waiverEventId);

    return {
      output: { waivers },
      message: 'Retrieved the event waiver response.'
    };
  })
  .build();
