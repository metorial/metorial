import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let logMeeting = SlateTool.create(spec, {
  name: 'Log Meeting',
  key: 'log_meeting',
  description: `Log a meeting in Salesflare. Requires a date and participant contact IDs. Optionally set end date, subject, description, notes, and meeting type (in-person or phone).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      date: z.string().describe('Meeting start date/time (ISO 8601)'),
      participantIds: z.array(z.number()).describe('Contact IDs of meeting participants'),
      endDate: z.string().optional().describe('Meeting end date/time (ISO 8601)'),
      subject: z.string().optional().describe('Meeting subject'),
      description: z.string().optional().describe('Meeting description'),
      notes: z.string().optional().describe('Meeting notes'),
      type: z
        .enum(['meeting-live', 'meeting-phone'])
        .optional()
        .default('meeting-live')
        .describe('Meeting type: in-person or phone')
    })
  )
  .output(
    z.object({
      meetingId: z.number().describe('ID of the created meeting'),
      meeting: z.record(z.string(), z.any()).describe('Created meeting data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let data: Record<string, any> = {
      date: ctx.input.date,
      participants: ctx.input.participantIds,
      type: ctx.input.type
    };
    if (ctx.input.endDate) data.end_date = ctx.input.endDate;
    if (ctx.input.subject) data.subject = ctx.input.subject;
    if (ctx.input.description) data.description = ctx.input.description;
    if (ctx.input.notes) data.notes = ctx.input.notes;

    let result = await client.createMeeting(data);
    let meetingData = Array.isArray(result) ? result[0] : result;
    let meetingId = meetingData?.id ?? 0;

    return {
      output: {
        meetingId,
        meeting: meetingData
      },
      message: `Logged meeting${ctx.input.subject ? ` **"${ctx.input.subject}"**` : ''} on ${ctx.input.date} (ID: ${meetingId}).`
    };
  })
  .build();
