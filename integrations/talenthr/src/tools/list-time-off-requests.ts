import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let timeOffRequestSchema = z.object({
  requestId: z.number().describe('Time off request ID'),
  timeOffTypeName: z.string().describe('Type of time off (e.g. Vacation, Sick Leave)'),
  startDate: z.string().describe('Start date of the time off'),
  endDate: z.string().describe('End date of the time off'),
  status: z.string().describe('Current status of the request')
});

export let listTimeOffRequests = SlateTool.create(spec, {
  name: 'List Time Off Requests',
  key: 'list_time_off_requests',
  description: `List time off requests for a specific employee in TalentHR. Returns the requests with their type, dates, and current status.
Use this to review pending requests before approving or rejecting them.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      employeeId: z.string().describe('ID of the employee to list time off requests for'),
      limit: z
        .number()
        .optional()
        .default(100)
        .describe('Maximum number of requests to return'),
      offset: z
        .number()
        .optional()
        .default(0)
        .describe('Number of records to skip for pagination')
    })
  )
  .output(
    z.object({
      requests: z.array(timeOffRequestSchema).describe('List of time off requests'),
      count: z.number().describe('Number of requests returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listTimeOffRequests(ctx.input.employeeId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let requests = response.data.rows.map(req => ({
      requestId: req.id,
      timeOffTypeName: req.timeoff_type_name,
      startDate: req.start_date,
      endDate: req.end_date,
      status: req.status
    }));

    return {
      output: {
        requests,
        count: requests.length
      },
      message: `Retrieved **${requests.length}** time off request(s) for employee ${ctx.input.employeeId}.`
    };
  })
  .build();
