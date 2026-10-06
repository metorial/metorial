import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { id, phone } from '../lib/contracts';
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
      accepted: z.boolean().optional(),
      confirmed: z.boolean().optional(),
      callId: z.number().optional().describe('ID of the created call'),
      direction: z.string().optional().describe('Call direction'),
      status: z.string().optional().describe('Initial call status')
    })
  )
  .handleInvocation(async ctx => {
    await new Client(ctx.auth).startOutboundCall(
      id(ctx.input.userId),
      id(ctx.input.numberId),
      phone(ctx.input.to)
    );
    return {
      output: { accepted: true, confirmed: false },
      message:
        'Aircall acknowledged the outbound-call request. It returned no call ID or connection status; do not retry blindly because a call may already start.'
    };
  })
  .build();
