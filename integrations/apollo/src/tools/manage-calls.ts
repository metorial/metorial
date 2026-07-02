import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { apolloServiceError } from '../lib/errors';
import { spec } from '../spec';

let callFieldsSchema = z.object({
  logged: z.boolean().optional().describe('Set true to create an individual call record'),
  userIds: z.array(z.string()).optional().describe('Apollo user IDs for callers on the call'),
  contactId: z.string().optional().describe('Apollo contact ID associated with the call'),
  accountId: z.string().optional().describe('Apollo account ID associated with the call'),
  toNumber: z.string().optional().describe('Phone number dialed'),
  fromNumber: z.string().optional().describe('Phone number used to dial'),
  status: z
    .enum(['queued', 'ringing', 'in-progress', 'completed', 'no_answer', 'failed', 'busy'])
    .optional()
    .describe('Call status'),
  startTime: z.string().optional().describe('Call start time in ISO 8601 format'),
  endTime: z.string().optional().describe('Call end time in ISO 8601 format'),
  duration: z.number().optional().describe('Call duration in seconds'),
  phoneCallPurposeId: z.string().optional().describe('Apollo call purpose ID'),
  phoneCallOutcomeId: z.string().optional().describe('Apollo call outcome ID'),
  note: z.string().optional().describe('Call note')
});

let callOutputSchema = z.object({
  callId: z.string().optional(),
  status: z.string().optional(),
  contactId: z.string().optional(),
  accountId: z.string().optional(),
  toNumber: z.string().optional(),
  fromNumber: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  duration: z.number().optional(),
  note: z.string().optional()
});

let optionalString = (value: unknown) =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

let optionalNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    let parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

let formatCall = (call: Record<string, any>) => ({
  callId: optionalString(call.id),
  status: optionalString(call.status),
  contactId: optionalString(call.contact_id),
  accountId: optionalString(call.account_id),
  toNumber: optionalString(call.to_number),
  fromNumber: optionalString(call.from_number),
  startTime: optionalString(call.start_time),
  endTime: optionalString(call.end_time),
  duration: optionalNumber(call.duration),
  note: optionalString(call.note)
});

let ensureCallHasTarget = (input: z.infer<typeof callFieldsSchema>) => {
  if (!input.contactId && !input.accountId && !input.toNumber && !input.fromNumber) {
    throw apolloServiceError(
      'Provide at least one call target: contactId, accountId, toNumber, or fromNumber.'
    );
  }
};

export let searchCalls = SlateTool.create(spec, {
  name: 'Search Calls',
  key: 'search_calls',
  description:
    'Search Apollo call records by date, duration, direction, user, purpose, outcome, or keywords.',
  constraints: ['Requires a master API key'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dateFrom: z.string().optional().describe('Minimum call date as YYYY-MM-DD'),
      dateTo: z.string().optional().describe('Maximum call date as YYYY-MM-DD'),
      durationMin: z.number().optional().describe('Minimum call duration in seconds'),
      durationMax: z.number().optional().describe('Maximum call duration in seconds'),
      inbound: z
        .enum(['incoming', 'outgoing'])
        .optional()
        .describe('Filter calls by direction'),
      userIds: z.array(z.string()).optional().describe('Apollo user IDs to filter by'),
      contactLabelIds: z
        .array(z.string())
        .optional()
        .describe('Contact label IDs to filter by'),
      phoneCallPurposeIds: z
        .array(z.string())
        .optional()
        .describe('Call purpose IDs to filter by'),
      phoneCallOutcomeIds: z
        .array(z.string())
        .optional()
        .describe('Call outcome IDs to filter by'),
      keywords: z.string().optional().describe('Keywords to search calls'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 25)')
    })
  )
  .output(
    z.object({
      calls: z.array(callOutputSchema),
      totalEntries: z.number().optional(),
      currentPage: z.number().optional(),
      totalPages: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let result = await client.searchCalls({
      dateRangeMin: ctx.input.dateFrom,
      dateRangeMax: ctx.input.dateTo,
      durationMin: ctx.input.durationMin,
      durationMax: ctx.input.durationMax,
      inbound: ctx.input.inbound,
      userIds: ctx.input.userIds,
      contactLabelIds: ctx.input.contactLabelIds,
      phoneCallPurposeIds: ctx.input.phoneCallPurposeIds,
      phoneCallOutcomeIds: ctx.input.phoneCallOutcomeIds,
      qKeywords: ctx.input.keywords,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });
    let calls = result.calls.map(formatCall);

    return {
      output: {
        calls,
        totalEntries: optionalNumber(result.pagination?.total_entries),
        currentPage: optionalNumber(result.pagination?.page),
        totalPages: optionalNumber(result.pagination?.total_pages)
      },
      message: `Found **${result.pagination?.total_entries ?? calls.length}** call(s). Returned ${calls.length}.`
    };
  })
  .build();

export let createCall = SlateTool.create(spec, {
  name: 'Create Call',
  key: 'create_call',
  description:
    'Create a call record in Apollo for calls made in external systems. This logs the call only; it does not dial prospects.',
  constraints: ['Requires a master API key'],
  tags: {
    destructive: false
  }
})
  .input(callFieldsSchema)
  .output(
    z.object({
      call: callOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    ensureCallHasTarget(ctx.input);

    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let result = await client.createCall(ctx.input);
    let call = formatCall(result.call);

    return {
      output: { call },
      message: `Created call record${call.callId ? ` **${call.callId}**` : ''}.`
    };
  })
  .build();

export let updateCall = SlateTool.create(spec, {
  name: 'Update Call',
  key: 'update_call',
  description: 'Update an Apollo call record by call ID.',
  constraints: ['Requires a master API key'],
  tags: {
    destructive: false
  }
})
  .input(
    z
      .object({
        callId: z.string().describe('Apollo call record ID to update')
      })
      .merge(callFieldsSchema)
  )
  .output(
    z.object({
      call: callOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let result = await client.updateCall(ctx.input.callId, ctx.input);
    let call = formatCall(result.call);

    return {
      output: { call },
      message: `Updated call record **${ctx.input.callId}**.`
    };
  })
  .build();
