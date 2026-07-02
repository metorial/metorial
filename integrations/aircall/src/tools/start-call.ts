import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let startCall = SlateTool.create(spec, {
  name: 'Start Outbound Call',
  key: 'start_call',
  description: `Initiate an outbound call on behalf of a user. The user must be available, not currently on a call, and associated with the specified number. Works only on desktop app.`,
  constraints: [
    'User must be available and not on a call.',
    'User must be associated with the specified Aircall number.',
    'Only works when the user is on the Aircall desktop app.'
  ]
})
  .input(
    z.object({
      userId: z.number().describe('ID of the user to initiate the call for'),
      numberId: z.number().describe('ID of the Aircall number to call from'),
      to: z.string().describe('Phone number to call in E.164 format (e.g., +18001234567)')
    })
  )
  .output(
    z.object({
      callId: z.number().describe('ID of the created call'),
      direction: z.string().describe('Call direction'),
      status: z.string().describe('Initial call status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let call = await client.startOutboundCall(
      ctx.input.userId,
      ctx.input.numberId,
      ctx.input.to
    );

    return {
      output: {
        callId: call.id,
        direction: call.direction || 'outbound',
        status: call.status || 'initial'
      },
      message: `Started outbound call **#${call.id}** to ${ctx.input.to} for user #${ctx.input.userId}.`
    };
  })
  .build();
