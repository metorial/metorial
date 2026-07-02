import { SlateTool } from 'slates';
import { z } from 'zod';
import { CallPageClient } from '../lib/client';
import { spec } from '../spec';

export let getCall = SlateTool.create(spec, {
  name: 'Get Call',
  key: 'get_call',
  description: `Retrieve detailed information about a specific call, including caller geo-location, UTM data, call duration, recording availability, tags, notes, feedback, and custom form fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      callId: z.number().describe('The ID of the call to retrieve')
    })
  )
  .output(
    z.object({
      call: z
        .any()
        .describe(
          'Full call details including status, timing, recording, tags, notes, and form fields'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });

    let call = await client.getCall(ctx.input.callId);

    return {
      output: { call },
      message: `Retrieved details for call **#${ctx.input.callId}**.`
    };
  })
  .build();
