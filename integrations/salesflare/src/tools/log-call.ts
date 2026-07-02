import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let logCall = SlateTool.create(spec, {
  name: 'Log Call',
  key: 'log_call',
  description: `Log a phone call in Salesflare. Requires a date and participant contact IDs. Optionally set end date, subject, description, and notes.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      date: z.string().describe('Call start date/time (ISO 8601)'),
      participantIds: z.array(z.number()).describe('Contact IDs of call participants'),
      endDate: z.string().optional().describe('Call end date/time (ISO 8601)'),
      subject: z.string().optional().describe('Call subject'),
      description: z.string().optional().describe('Call description'),
      notes: z.string().optional().describe('Call notes')
    })
  )
  .output(
    z.object({
      callId: z.number().describe('ID of the created call'),
      call: z.record(z.string(), z.any()).describe('Created call data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let data: Record<string, any> = {
      date: ctx.input.date,
      participants: ctx.input.participantIds
    };
    if (ctx.input.endDate) data.end_date = ctx.input.endDate;
    if (ctx.input.subject) data.subject = ctx.input.subject;
    if (ctx.input.description) data.description = ctx.input.description;
    if (ctx.input.notes) data.notes = ctx.input.notes;

    let result = await client.createCall(data);
    let callData = Array.isArray(result) ? result[0] : result;
    let callId = callData?.id ?? 0;

    return {
      output: {
        callId,
        call: callData
      },
      message: `Logged call${ctx.input.subject ? ` **"${ctx.input.subject}"**` : ''} on ${ctx.input.date} (ID: ${callId}).`
    };
  })
  .build();
