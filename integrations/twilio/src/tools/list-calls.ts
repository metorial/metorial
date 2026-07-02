import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwilioClient } from '../lib/client';
import { spec } from '../spec';

let callSchema = z.object({
  callSid: z.string().describe('Unique SID of the call'),
  status: z
    .string()
    .describe(
      'Call status (queued, ringing, in-progress, completed, busy, failed, no-answer, canceled)'
    ),
  to: z.string().describe('Called party number'),
  from: z.string().describe('Caller number'),
  direction: z.string().describe('Call direction (inbound, outbound-api, outbound-dial)'),
  duration: z.string().nullable().describe('Call duration in seconds'),
  price: z.string().nullable().describe('Price charged for the call'),
  priceUnit: z.string().nullable().describe('Currency of the price'),
  answeredBy: z.string().nullable().describe('Whether answered by human or machine'),
  callerName: z.string().nullable().describe('Caller name if available'),
  dateCreated: z.string().nullable().describe('Date the call record was created'),
  startTime: z.string().nullable().describe('Time the call started'),
  endTime: z.string().nullable().describe('Time the call ended')
});

export let listCalls = SlateTool.create(spec, {
  name: 'List Calls',
  key: 'list_calls',
  description: `Retrieve call records from your Twilio account. Filter by caller, recipient, status, or time range. Also supports fetching a single call by SID, and modifying an in-progress call.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      callSid: z
        .string()
        .optional()
        .describe(
          'Fetch a specific call by its SID (starts with CA). If provided, other filters are ignored.'
        ),
      to: z.string().optional().describe('Filter calls to this phone number.'),
      from: z.string().optional().describe('Filter calls from this phone number.'),
      status: z
        .enum([
          'queued',
          'ringing',
          'in-progress',
          'completed',
          'busy',
          'failed',
          'no-answer',
          'canceled'
        ])
        .optional()
        .describe('Filter calls by status.'),
      startTimeAfter: z
        .string()
        .optional()
        .describe('Filter calls started after this datetime (YYYY-MM-DD format).'),
      startTimeBefore: z
        .string()
        .optional()
        .describe('Filter calls started before this datetime (YYYY-MM-DD format).'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of calls to return per page (max 1000, default 50).')
    })
  )
  .output(
    z.object({
      calls: z.array(callSchema).describe('List of call records'),
      hasMore: z.boolean().describe('Whether there are more calls available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwilioClient({
      accountSid: ctx.config.accountSid,
      token: ctx.auth.token,
      apiKeySid: ctx.auth.apiKeySid
    });

    if (ctx.input.callSid) {
      let result = await client.getCall(ctx.input.callSid);
      let mapped = {
        callSid: result.sid,
        status: result.status,
        to: result.to,
        from: result.from,
        direction: result.direction,
        duration: result.duration,
        price: result.price,
        priceUnit: result.price_unit,
        answeredBy: result.answered_by,
        callerName: result.caller_name,
        dateCreated: result.date_created,
        startTime: result.start_time,
        endTime: result.end_time
      };
      return {
        output: { calls: [mapped], hasMore: false },
        message: `Fetched call **${result.sid}** (status: **${result.status}**, duration: ${result.duration || 0}s).`
      };
    }

    let result = await client.listCalls({
      to: ctx.input.to,
      from: ctx.input.from,
      status: ctx.input.status,
      startTimeAfter: ctx.input.startTimeAfter,
      startTimeBefore: ctx.input.startTimeBefore,
      pageSize: ctx.input.pageSize
    });

    let calls = (result.calls || []).map((c: any) => ({
      callSid: c.sid,
      status: c.status,
      to: c.to,
      from: c.from,
      direction: c.direction,
      duration: c.duration,
      price: c.price,
      priceUnit: c.price_unit,
      answeredBy: c.answered_by,
      callerName: c.caller_name,
      dateCreated: c.date_created,
      startTime: c.start_time,
      endTime: c.end_time
    }));

    return {
      output: { calls, hasMore: !!result.next_page_uri },
      message: `Found **${calls.length}** call(s).${result.next_page_uri ? ' More results available.' : ''}`
    };
  })
  .build();
