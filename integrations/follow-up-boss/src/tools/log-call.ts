import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let logCall = SlateTool.create(spec, {
  name: 'Log Call',
  key: 'log_call',
  description: `Log a phone call to a contact in Follow Up Boss. Records call details including duration, outcome, and notes for communication tracking.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      personId: z.number().describe('Contact ID the call is associated with'),
      incoming: z
        .boolean()
        .optional()
        .describe('Whether the call was incoming (true) or outgoing (false)'),
      duration: z.number().optional().describe('Call duration in seconds'),
      note: z.string().optional().describe('Notes about the call'),
      outcome: z
        .string()
        .optional()
        .describe('Call outcome (e.g., "connected", "no answer", "left voicemail")'),
      userId: z.number().optional().describe('User ID who made/received the call'),
      callDate: z.string().optional().describe('Date of the call (ISO 8601)'),
      phone: z.string().optional().describe('Phone number called')
    })
  )
  .output(
    z.object({
      callId: z.number(),
      personId: z.number().optional(),
      duration: z.number().optional(),
      incoming: z.boolean().optional(),
      created: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let data: Record<string, any> = {
      personId: ctx.input.personId
    };
    if (ctx.input.incoming !== undefined) data.incoming = ctx.input.incoming;
    if (ctx.input.duration !== undefined) data.duration = ctx.input.duration;
    if (ctx.input.note !== undefined) data.note = ctx.input.note;
    if (ctx.input.outcome !== undefined) data.outcome = ctx.input.outcome;
    if (ctx.input.userId !== undefined) data.userId = ctx.input.userId;
    if (ctx.input.callDate !== undefined) data.callDate = ctx.input.callDate;
    if (ctx.input.phone !== undefined) data.phone = ctx.input.phone;

    let call = await client.createCall(data);

    return {
      output: {
        callId: call.id,
        personId: call.personId,
        duration: call.duration,
        incoming: call.incoming,
        created: call.created
      },
      message: `Logged ${ctx.input.incoming ? 'incoming' : 'outgoing'} call for contact **${ctx.input.personId}**${ctx.input.duration ? ` (${ctx.input.duration}s)` : ''}.`
    };
  })
  .build();
