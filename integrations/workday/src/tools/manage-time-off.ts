import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, display } from '../lib/client';
import { record, workerIdSchema } from '../lib/contracts';
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
      workerId: workerIdSchema,
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
            dailyQuantity: z
              .number()
              .optional()
              .describe('Quantity in the units of the selected time-off type'),
            timeOffType: workdayReferenceSchema.optional().describe('Type of time off'),
            worker: workdayReferenceSchema.optional().describe('Worker reference'),
            status: z.string().optional().describe('Entry status'),
            unit: workdayReferenceSchema
              .optional()
              .describe('Units for dailyQuantity, such as hours or days')
          })
        )
        .describe('List of time-off entries'),
      total: z.number().describe('Total number of matching entries')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx.auth, ctx.config);

    let result = await client.getWorkerTimeOffEntries(ctx.input.workerId, {
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let entries = result.data.map(e => ({
      entryId: e.timeOffEntryId ?? e.id,
      date: e.date,
      dailyQuantity: e.quantity ?? e.dailyQuantity,
      timeOffType: e.timeOffType,
      worker: e.worker,
      unit: e.unit,
      status: display(e.status)
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
  description: `Submit a time-off request for a specific worker. Initiates a Request Time Off business process for one day with the specified type and quantity. Approval or later business-process steps may remain pending.`,
  instructions: [
    'Each request covers a single day. For multi-day time off, make separate requests for each day.',
    'Discover eligible_absence_types and valid_time_off_dates using list_resources first. Use their units and quantities; do not assume eight hours.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workerId: workerIdSchema,
      date: z.string().describe('Date of the time-off request in YYYY-MM-DD format'),
      dailyQuantity: z
        .number()
        .describe(
          'Quantity in the discovered time-off type units; confirm its permitted range rather than assuming hours'
        ),
      timeOffTypeId: z.string().describe('Workday ID of the time-off type'),
      comment: z.string().optional().describe('Optional comment for the time-off request'),
      positionId: z
        .string()
        .optional()
        .describe('Position required by the eligible absence type, if any'),
      reasonId: z
        .string()
        .optional()
        .describe('Reason required by the eligible absence type, if any'),
      start: z
        .string()
        .optional()
        .describe(
          'Start timestamp on the requested date when the time-off type requires an interval'
        ),
      end: z
        .string()
        .optional()
        .describe('End timestamp on the requested date; provide with start')
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
    const client = createClient(ctx.auth, ctx.config);

    let result = await client.requestTimeOff(ctx.input.workerId, {
      date: ctx.input.date,
      dailyQuantity: ctx.input.dailyQuantity,
      timeOffType: { id: ctx.input.timeOffTypeId },
      comment: ctx.input.comment,
      positionId: ctx.input.positionId,
      reasonId: ctx.input.reasonId,
      start: ctx.input.start,
      end: ctx.input.end
    });

    return {
      output: {
        requestId: typeof result.id === 'string' ? result.id : undefined,
        status: display(
          result.businessProcessParameters &&
            record(result.businessProcessParameters).transactionStatus
        ),
        rawResponse: result
      },
      message:
        'Workday accepted the time-off request business process. Approval and subsequent steps may still be pending.'
    };
  })
  .build();
