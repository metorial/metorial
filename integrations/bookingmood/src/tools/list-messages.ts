import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

let messageSchema = z.object({
  messageId: z.string().describe('UUID of the message'),
  bookingId: z.string().nullable().describe('UUID of the associated booking'),
  calendarEventId: z.string().nullable().describe('UUID of the related calendar event'),
  messageTemplateId: z.string().nullable().describe('UUID of the email template'),
  subject: z.string().describe('Email subject line'),
  type: z.string().describe('Message type: email or sms'),
  status: z
    .string()
    .describe(
      'Message status: manually-scheduled, scheduled-around-arrival, scheduled-around-departure, or sent'
    ),
  sendAt: z.string().nullable().describe('Scheduled send timestamp'),
  createdAt: z.string().describe('Creation timestamp')
});

export let listMessages = SlateTool.create(spec, {
  name: 'List Messages',
  key: 'list_messages',
  description: `Lists guest messages (emails/SMS) with optional filtering. Filter by booking, calendar event, status, or type.`,
  constraints: ['Maximum 1000 results per request.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      bookingId: z.string().optional().describe('Filter by booking UUID'),
      calendarEventId: z.string().optional().describe('Filter by calendar event UUID'),
      filters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional PostgREST-style filters'),
      order: z.string().optional().describe('Sort order'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Number of results to skip')
    })
  )
  .output(
    z.object({
      messages: z.array(messageSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);
    let filters = { ...ctx.input.filters };
    if (ctx.input.bookingId) filters.booking_id = `eq.${ctx.input.bookingId}`;
    if (ctx.input.calendarEventId)
      filters.calendar_event_id = `eq.${ctx.input.calendarEventId}`;

    let messages = await client.listMessages({
      select:
        'id,booking_id,calendar_event_id,message_template_id,subject,type,status,send_at,created_at',
      filters,
      order: ctx.input.order,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let mapped = (messages || []).map((m: any) => ({
      messageId: m.id,
      bookingId: m.booking_id ?? null,
      calendarEventId: m.calendar_event_id ?? null,
      messageTemplateId: m.message_template_id ?? null,
      subject: m.subject,
      type: m.type,
      status: m.status,
      sendAt: m.send_at ?? null,
      createdAt: m.created_at
    }));

    return {
      output: { messages: mapped },
      message: `Found **${mapped.length}** message(s).`
    };
  })
  .build();
