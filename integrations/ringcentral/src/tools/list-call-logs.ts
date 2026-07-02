import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let callLogRecordSchema = z.object({
  callId: z.string().optional().describe('Unique identifier of the call'),
  sessionId: z.string().optional().describe('Unique identifier of the call session'),
  startTime: z.string().optional().describe('Call start time in ISO 8601 format'),
  duration: z.number().optional().describe('Call duration in seconds'),
  type: z.string().optional().describe('Call type (Voice, Fax)'),
  direction: z.string().optional().describe('Call direction (Inbound, Outbound)'),
  action: z.string().optional().describe('Call action (Phone Call, VoIP Call, etc.)'),
  result: z.string().optional().describe('Call result (Accepted, Missed, Voicemail, etc.)'),
  from: z
    .object({
      phoneNumber: z.string().optional(),
      name: z.string().optional(),
      extensionId: z.string().optional()
    })
    .optional()
    .describe('Caller information'),
  to: z
    .object({
      phoneNumber: z.string().optional(),
      name: z.string().optional(),
      extensionId: z.string().optional()
    })
    .optional()
    .describe('Callee information'),
  recording: z
    .object({
      id: z.string().optional(),
      contentUri: z.string().optional(),
      type: z.string().optional()
    })
    .optional()
    .describe('Recording information if available')
});

export let listCallLogs = SlateTool.create(spec, {
  name: 'List Call Logs',
  key: 'list_call_logs',
  description: `Retrieves call log records from RingCentral. Supports both extension-level and account-level call logs with filtering by date range, call type, and direction.`,
  instructions: [
    'Use **scope** "extension" to get call logs for a specific extension, or "account" for the entire account.',
    'When scope is "extension", you can optionally provide **extensionId** to target a specific extension. Defaults to the authenticated user.',
    'Use **dateFrom** and **dateTo** in ISO 8601 format (e.g. "2024-01-01T00:00:00Z") to filter by date range.',
    'Set **view** to "Detailed" to get additional call leg information including recording details.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      scope: z
        .enum(['extension', 'account'])
        .describe('Whether to list call logs for a specific extension or the entire account'),
      extensionId: z
        .string()
        .optional()
        .describe(
          'Extension ID to retrieve call logs for (only used when scope is "extension", defaults to current user)'
        ),
      dateFrom: z
        .string()
        .optional()
        .describe('Start date/time in ISO 8601 format (e.g. "2024-01-01T00:00:00Z")'),
      dateTo: z.string().optional().describe('End date/time in ISO 8601 format'),
      callType: z.enum(['Voice', 'Fax']).optional().describe('Filter by call type'),
      direction: z
        .enum(['Inbound', 'Outbound'])
        .optional()
        .describe('Filter by call direction'),
      view: z
        .enum(['Simple', 'Detailed'])
        .optional()
        .describe('Level of detail in the response (Detailed includes recording info)'),
      perPage: z.number().optional().describe('Number of records per page (max 250)'),
      page: z.number().optional().describe('Page number for pagination (1-based)')
    })
  )
  .output(
    z.object({
      records: z.array(callLogRecordSchema).describe('List of call log records'),
      totalCount: z.number().describe('Total number of matching records'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Number of records per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let commonParams = {
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      type: ctx.input.callType,
      direction: ctx.input.direction,
      view: ctx.input.view,
      perPage: ctx.input.perPage,
      page: ctx.input.page
    };

    let data: any;

    if (ctx.input.scope === 'account') {
      data = await client.getAccountCallLog(commonParams);
    } else {
      data = await client.getCallLog({
        ...commonParams,
        extensionId: ctx.input.extensionId
      });
    }

    let records = (data.records || []).map((record: any) => ({
      callId: record.id,
      sessionId: record.sessionId,
      startTime: record.startTime,
      duration: record.duration,
      type: record.type,
      direction: record.direction,
      action: record.action,
      result: record.result,
      from: record.from
        ? {
            phoneNumber: record.from.phoneNumber,
            name: record.from.name,
            extensionId: record.from.extensionId
          }
        : undefined,
      to: record.to
        ? {
            phoneNumber: record.to.phoneNumber,
            name: record.to.name,
            extensionId: record.to.extensionId
          }
        : undefined,
      recording: record.recording
        ? {
            id: record.recording.id,
            contentUri: record.recording.contentUri,
            type: record.recording.type
          }
        : undefined
    }));

    let totalCount = data.totalCount ?? records.length;
    let page = data.page ?? ctx.input.page ?? 1;
    let perPage = data.perPage ?? ctx.input.perPage ?? records.length;

    return {
      output: {
        records,
        totalCount,
        page,
        perPage
      },
      message: `Retrieved **${records.length}** call log records (page ${page}, ${totalCount} total) for ${ctx.input.scope === 'account' ? 'the account' : `extension ${ctx.input.extensionId || 'current user'}`}.`
    };
  })
  .build();
