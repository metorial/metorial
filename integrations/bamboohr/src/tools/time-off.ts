import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTimeOffRequests = SlateTool.create(spec, {
  name: 'Get Time Off Requests',
  key: 'get_time_off_requests',
  description: `Retrieve time off requests within a date range. Optionally filter by employee, status, or time off type. Returns all matching requests with their details including dates, status, type, and notes.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      start: z.string().describe('Start date in YYYY-MM-DD format'),
      end: z.string().describe('End date in YYYY-MM-DD format'),
      employeeId: z.string().optional().describe('Filter by a specific employee ID'),
      status: z
        .string()
        .optional()
        .describe(
          'Filter by status: "approved", "denied", "superceded", "requested", "canceled"'
        ),
      type: z.string().optional().describe('Filter by time off type ID')
    })
  )
  .output(
    z.object({
      requests: z.array(z.record(z.string(), z.any())).describe('List of time off requests')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    let data = await client.getTimeOffRequests({
      start: ctx.input.start,
      end: ctx.input.end,
      employeeId: ctx.input.employeeId,
      status: ctx.input.status,
      type: ctx.input.type
    });

    let requests = Array.isArray(data) ? data : [];

    return {
      output: {
        requests
      },
      message: `Found **${requests.length}** time off request(s) between ${ctx.input.start} and ${ctx.input.end}.`
    };
  })
  .build();

export let createTimeOffRequest = SlateTool.create(spec, {
  name: 'Create Time Off Request',
  key: 'create_time_off_request',
  description: `Submit a new time off request for an employee. Specify the employee, time off type, date range, and requested status. The request can be submitted as "requested" (pending approval) or "approved" (if you have admin permissions).`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      employeeId: z.string().describe('The employee ID'),
      timeOffTypeId: z
        .string()
        .describe('The time off type ID (use Get Time Off Types to find available types)'),
      start: z.string().describe('Start date in YYYY-MM-DD format'),
      end: z.string().describe('End date in YYYY-MM-DD format'),
      amount: z.number().describe('Number of days/hours requested'),
      status: z
        .enum(['requested', 'approved'])
        .default('requested')
        .describe('Initial status for the request'),
      notes: z
        .record(z.string(), z.string())
        .optional()
        .describe('Notes keyed by date (YYYY-MM-DD)'),
      dates: z
        .record(z.string(), z.number())
        .optional()
        .describe('Specific amounts per date (YYYY-MM-DD to hours/days)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the request was created successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    await client.createTimeOffRequest(ctx.input.employeeId, {
      status: ctx.input.status,
      start: ctx.input.start,
      end: ctx.input.end,
      timeOffTypeId: ctx.input.timeOffTypeId,
      amount: ctx.input.amount,
      notes: ctx.input.notes,
      dates: ctx.input.dates
    });

    return {
      output: {
        success: true
      },
      message: `Created time off request for employee **${ctx.input.employeeId}** from ${ctx.input.start} to ${ctx.input.end}.`
    };
  })
  .build();

export let updateTimeOffRequestStatus = SlateTool.create(spec, {
  name: 'Update Time Off Request Status',
  key: 'update_time_off_request_status',
  description: `Change the status of an existing time off request. Can approve, deny, or cancel a request. Optionally include a note explaining the status change.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      requestId: z.string().describe('The time off request ID'),
      status: z
        .enum(['approved', 'denied', 'canceled'])
        .describe('New status for the request'),
      note: z.string().optional().describe('Optional note explaining the status change')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('The request ID'),
      status: z.string().describe('The new status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    await client.updateTimeOffRequestStatus(
      ctx.input.requestId,
      ctx.input.status,
      ctx.input.note
    );

    return {
      output: {
        requestId: ctx.input.requestId,
        status: ctx.input.status
      },
      message: `Updated time off request **${ctx.input.requestId}** to status **${ctx.input.status}**.`
    };
  })
  .build();

export let getWhosOut = SlateTool.create(spec, {
  name: "Get Who's Out",
  key: 'get_whos_out',
  description: `See which employees are currently out or will be out during a given date range. Returns a list of employees with their time off details. If no dates are provided, returns who is out today.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      start: z
        .string()
        .optional()
        .describe('Start date in YYYY-MM-DD format (defaults to today)'),
      end: z
        .string()
        .optional()
        .describe('End date in YYYY-MM-DD format (defaults to 14 days from start)')
    })
  )
  .output(
    z.object({
      entries: z.array(z.record(z.string(), z.any())).describe("List of who's out entries")
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    let data = await client.getWhosOut(ctx.input.start, ctx.input.end);
    let entries = Array.isArray(data) ? data : [];

    return {
      output: {
        entries
      },
      message: `Found **${entries.length}** employee(s) out${ctx.input.start ? ` from ${ctx.input.start}` : ' today'}${ctx.input.end ? ` to ${ctx.input.end}` : ''}.`
    };
  })
  .build();

export let getTimeOffBalances = SlateTool.create(spec, {
  name: 'Get Time Off Balances',
  key: 'get_time_off_balances',
  description: `Retrieve time off balance information for an employee, showing available balances across all time off categories. Also returns assigned time off policies.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      employeeId: z.string().describe('The employee ID'),
      asOfDate: z
        .string()
        .optional()
        .describe('Calculate balances as of this date (YYYY-MM-DD). Defaults to today.')
    })
  )
  .output(
    z.object({
      employeeId: z.string().describe('The employee ID'),
      balances: z.any().describe('Time off balance data by category')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    let balances = await client.getTimeOffBalances(ctx.input.employeeId, ctx.input.asOfDate);

    return {
      output: {
        employeeId: ctx.input.employeeId,
        balances
      },
      message: `Retrieved time off balances for employee **${ctx.input.employeeId}**.`
    };
  })
  .build();

export let getTimeOffTypes = SlateTool.create(spec, {
  name: 'Get Time Off Types',
  key: 'get_time_off_types',
  description: `Retrieve all available time off types configured in BambooHR (e.g., vacation, sick leave, personal days). Returns type IDs, names, and policy details.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      timeOffTypes: z.any().describe('Map of time off type categories and their types')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    let data = await client.getTimeOffTypes();

    return {
      output: {
        timeOffTypes: data
      },
      message: `Retrieved available time off types.`
    };
  })
  .build();
