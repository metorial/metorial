import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCall = SlateTool.create(spec, {
  name: 'Get Call',
  key: 'get_call',
  description: `Retrieve detailed information about a specific call. Returns transcript, recording URL, call status, duration, end-call reason, collected variables, and telephony details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      callId: z.string().describe('The unique identifier of the call')
    })
  )
  .output(
    z.object({
      call: z
        .record(z.string(), z.any())
        .describe(
          'Full call details including transcript, status, recording, and collected variables'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getCall(ctx.input.callId);
    let call = result.response || {};

    return {
      output: {
        call
      },
      message: `Retrieved call \`${ctx.input.callId}\` with status **${call.status || call.call_status || 'unknown'}**.`
    };
  })
  .build();
