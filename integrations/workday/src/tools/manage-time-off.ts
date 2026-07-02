import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkdayClient } from '../lib/client';
import { spec } from '../spec';

let workdayReferenceSchema = z.object({
  id: z.string().optional().describe('Workday ID'),
  descriptor: z.string().optional().describe('Display name'),
  href: z.string().optional().describe('API href')
});

export let getTimeOffEntries = SlateTool.create(spec, {
  name: 'Get Time Off Entries',
  key: 'get_time_off_entries',
  description: `Retrieve time-off entries for a specific worker. Returns requested time-off entries with details including dates, quantities, types, and statuses. Optionally filter by date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workerId: z.string().describe('The Workday worker ID'),
      fromDate: z.string().optional().describe('Start date filter in YYYY-MM-DD format'),
      toDate: z.string().optional().describe('End date filter in YYYY-MM-DD format'),
      limit: z.number().optional().describe('Maximum number of results (default: 20)'),
      offset: z.number().optional().describe('Pagination offset (default: 0)')
    })
  )
  .output(
    z.object({
      entries: z
        .array(
          z.object({
            entryId: z.string().optional().describe('Time-off entry ID'),
            date: z.string().optional().describe('Date of the time-off entry'),
            dailyQuantity: z.number().optional().describe('Number of hours for the day'),
            timeOffType: workdayReferenceSchema.optional().describe('Type of time off'),
            worker: workdayReferenceSchema.optional().describe('Worker reference'),
            status: z.string().optional().describe('Entry status')
          })
        )
        .describe('List of time-off entries'),
      total: z.number().describe('Total number of matching entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkdayClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      tenant: ctx.config.tenant
    });

    let result = await client.getWorkerTimeOffEntries(ctx.input.workerId, {
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let entries = result.data.map(e => ({
      entryId: e.id,
      date: e.date,
      dailyQuantity: e.dailyQuantity,
      timeOffType: e.timeOffType,
      worker: e.worker,
      status: e.status
    }));

    return {
      output: { entries, total: result.total },
      message: `Retrieved **${result.total}** time-off entries for worker ${ctx.input.workerId}. Returned ${entries.length} results.`
    };
  })
  .build();

export let requestTimeOff = SlateTool.create(spec, {
  name: 'Request Time Off',
  key: 'request_time_off',
  description: `Submit a time-off request for a specific worker. Creates a single-day time-off entry with the specified type and duration. For multi-day requests, submit one request per day.`,
  instructions: [
    'Each request covers a single day. For multi-day time off, make separate requests for each day.',
    'The dailyQuantity is typically 8 for a full day, matching the default Workday behavior.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workerId: z.string().describe('The Workday worker ID'),
      date: z.string().describe('Date of the time-off request in YYYY-MM-DD format'),
      dailyQuantity: z
        .number()
        .describe('Number of hours for the day (e.g., 8 for a full day)'),
      timeOffTypeId: z.string().describe('Workday ID of the time-off type'),
      comment: z.string().optional().describe('Optional comment for the time-off request')
    })
  )
  .output(
    z.object({
      requestId: z.string().optional().describe('ID of the created time-off request'),
      status: z.string().optional().describe('Status of the request'),
      rawResponse: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkdayClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      tenant: ctx.config.tenant
    });

    let result = await client.requestTimeOff(ctx.input.workerId, {
      date: ctx.input.date,
      dailyQuantity: ctx.input.dailyQuantity,
      timeOffType: { id: ctx.input.timeOffTypeId },
      comment: ctx.input.comment
    });

    return {
      output: {
        requestId: result?.id,
        status: result?.status ?? 'submitted',
        rawResponse: result
      },
      message: `Time-off request submitted for worker ${ctx.input.workerId} on ${ctx.input.date} (${ctx.input.dailyQuantity} hours).`
    };
  })
  .build();
