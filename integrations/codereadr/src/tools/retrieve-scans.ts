import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let retrieveScans = SlateTool.create(spec, {
  name: 'Retrieve Scans',
  key: 'retrieve_scans',
  description: `Search and retrieve barcode scan records from CodeREADr. Filter by service, user, device, date range, barcode value, status, and more. Returns scan metadata including timestamps, GPS data, and question answers.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z
        .string()
        .optional()
        .describe('Filter by service ID (comma-separated for multiple)'),
      userId: z
        .string()
        .optional()
        .describe('Filter by user ID (comma-separated for multiple)'),
      deviceId: z
        .string()
        .optional()
        .describe('Filter by device ID (comma-separated for multiple)'),
      scanId: z.string().optional().describe('Retrieve specific scan ID(s)'),
      status: z
        .enum(['1', '0', '-1'])
        .optional()
        .describe('Filter by validation status: "1"=valid, "0"=invalid, "-1"=unvalidated'),
      startDate: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
      startTime: z.string().optional().describe('Start time filter (HH:mm:ss)'),
      endTime: z.string().optional().describe('End time filter (HH:mm:ss)'),
      value: z.string().optional().describe('Exact barcode value to match'),
      valueLike: z.string().optional().describe('Partial barcode value to search for'),
      keyword: z.string().optional().describe('General search keyword'),
      limit: z.string().optional().describe('Maximum number of results (default 10000)'),
      offset: z.string().optional().describe('Result offset for pagination'),
      orderBy: z
        .string()
        .optional()
        .describe('Sort field (e.g., "timestamp", "barcode", "timestamp_desc")'),
      timezone: z.string().optional().describe('Timezone for timestamps'),
      onlyRecent: z
        .string()
        .optional()
        .describe('Set to "1" to return only the latest scan per barcode')
    })
  )
  .output(
    z.object({
      count: z.string().describe('Total number of matching scans'),
      scans: z
        .array(
          z
            .object({
              scanId: z.string().describe('Unique scan record ID'),
              tid: z.string().optional().describe('Scanned barcode value'),
              service: z.string().optional().describe('Service name'),
              user: z.string().optional().describe('Scanning user name'),
              device: z.string().optional().describe('Device name'),
              status: z.string().optional().describe('Validation status'),
              timestamp: z.string().optional().describe('Scan timestamp'),
              answers: z
                .array(
                  z.object({
                    questionId: z.string().optional(),
                    answerText: z.string().optional()
                  })
                )
                .optional()
                .describe('Question answers submitted with the scan'),
              properties: z
                .record(z.string(), z.string())
                .optional()
                .describe('Additional scan properties')
            })
            .passthrough()
        )
        .describe('Scan records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.retrieveScans({
      serviceId: ctx.input.serviceId,
      userId: ctx.input.userId,
      deviceId: ctx.input.deviceId,
      scanId: ctx.input.scanId,
      status: ctx.input.status,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      value: ctx.input.value,
      valueLike: ctx.input.valueLike,
      keyword: ctx.input.keyword,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      orderBy: ctx.input.orderBy,
      timezone: ctx.input.timezone,
      onlyRecent: ctx.input.onlyRecent
    });

    return {
      output: result,
      message: `Found **${result.count}** scan(s). Returned **${result.scans.length}** record(s).`
    };
  })
  .build();
