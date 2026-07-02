import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoceanClient } from '../lib/client';
import { spec } from '../spec';

export let hangupCall = SlateTool.create(spec, {
  name: 'Hang Up Call',
  key: 'hangup_call',
  description: `Terminate an active voice call using its call UUID. The call UUID is obtained from the Make Voice Call response.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      callUuid: z
        .string()
        .describe('The unique call UUID to terminate (from the Make Voice Call response)')
    })
  )
  .output(
    z.object({
      status: z.number().describe('Status code (0 = success)'),
      sessionUuid: z.string().optional().describe('Voice session identifier'),
      callUuid: z.string().optional().describe('The terminated call identifier')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoceanClient({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.hangupCall(ctx.input.callUuid);

    return {
      output: {
        status: result.status,
        sessionUuid: result.session_uuid,
        callUuid: result.call_uuid || result.calluuid
      },
      message: `Call **${ctx.input.callUuid}** has been terminated.`
    };
  })
  .build();
