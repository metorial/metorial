import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCall = SlateTool.create(spec, {
  name: 'Get Call',
  key: 'get_call',
  description: `Retrieve detailed information about a specific call. Returns transcript, recording URL, call status, duration, end-call reason, collected variables, and telephony details. Optionally prepare the recording as a downloadable file.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      callId: z.string().min(1).describe('Call ID from make_call or list_calls'),
      downloadRecording: z
        .boolean()
        .optional()
        .describe('Prepare a downloadable recording; the call must have a recording URL')
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
    let client = new Client(ctx.auth);
    let result = await client.getCall(ctx.input.callId);
    let calls = result.response?.calls;
    let call = Array.isArray(calls)
      ? calls.find(item => item?.call_id === ctx.input.callId)
      : undefined;
    if (!call) throw createApiServiceError('Synthflow did not return the requested call.');
    if (ctx.input.downloadRecording) {
      if (!call.recording_url || !z.string().url().safeParse(call.recording_url).success)
        throw createApiServiceError(
          'This call has no downloadable recording. Enable recording on the agent and wait for the call to finish.'
        );
      await ctx.addAttachment({ type: 'url', url: call.recording_url });
    }

    return {
      output: {
        call
      },
      message: `Retrieved call \`${ctx.input.callId}\` with status **${call.status || call.call_status || 'unknown'}**.`
    };
  })
  .build();
