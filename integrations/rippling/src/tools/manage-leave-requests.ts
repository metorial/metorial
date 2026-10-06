import { SlateTool } from 'slates';
import { z } from 'zod';
import { RipplingClient } from '../lib/client';
import { mapLeave } from '../lib/models';
import { spec } from '../spec';

let leaveRequestSchema = z.object({
  leaveRequestId: z.string().describe('Unique leave request identifier'),
  role: z.string().optional().describe('Employee role ID'),
  requestedBy: z.string().optional().describe('ID of the employee who requested the leave'),
  status: z
    .string()
    .optional()
    .describe('Leave request status (e.g. PENDING, APPROVED, DECLINED)'),
  startDate: z.string().optional().describe('Leave start date'),
  endDate: z.string().optional().describe('Leave end date'),
  companyLeaveType: z.string().optional().describe('Company leave type identifier'),
  leavePolicy: z.string().optional().describe('Leave policy identifier'),
  reasonForLeave: z.string().optional().describe('Reason for leave'),
  managedBy: z
    .string()
    .optional()
    .describe('System managing this leave request (PTO, LEAVES, TILT)'),
  isPaid: z.boolean().optional().describe('Whether the leave is paid')
});

export let listLeaveRequests = SlateTool.create(spec, {
  name: 'List Leave Requests',
  key: 'list_leave_requests',
  description: `Retrieve leave requests from Rippling. Can be filtered by date range and status to find specific requests.`,
  instructions: [
    'Use status filter values like PENDING, APPROVED, or DECLINED.',
    'Date filters use ISO 8601 format (YYYY-MM-DD).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z
        .string()
        .optional()
        .describe('Filter leave requests starting on or after this date (YYYY-MM-DD)'),
      endDate: z
        .string()
        .optional()
        .describe('Filter leave requests ending on or before this date (YYYY-MM-DD)'),
      limit: z.number().optional().describe('Page size from 1 to 100'),
      offset: z.number().optional().describe('Nonnegative page offset'),
      roleId: z.string().optional().describe('Filter by employee role ID'),
      status: z
        .string()
        .optional()
        .describe('Filter by status (e.g. PENDING, APPROVED, DECLINED)')
    })
  )
  .output(
    z.object({
      leaveRequests: z.array(leaveRequestSchema).describe('List of leave requests'),
      count: z.number().describe('Number of leave requests returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RipplingClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let requests = await client.listLeaveRequests({
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      status: ctx.input.status,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      role: ctx.input.roleId
    });

    const items = requests.map(mapLeave);

    return {
      output: {
        leaveRequests: items,
        count: items.length
      },
      message: `Retrieved **${items.length}** leave request(s).`
    };
  })
  .build();

export let processLeaveRequest = SlateTool.create(spec, {
  name: 'Process Leave Request',
  key: 'process_leave_request',
  description: `Approve or decline a pending leave request. Returns the updated leave request details after processing.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      leaveRequestId: z
        .string()
        .describe('The unique identifier of the leave request to process'),
      action: z.enum(['APPROVE', 'DECLINE']).describe('Action to take on the leave request')
    })
  )
  .output(leaveRequestSchema)
  .handleInvocation(async ctx => {
    let client = new RipplingClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });
    let result = await client.processLeaveRequest(ctx.input.leaveRequestId, ctx.input.action);

    return {
      output: mapLeave(result),
      message: `Leave request **${ctx.input.leaveRequestId}** has been **${ctx.input.action === 'APPROVE' ? 'approved' : 'declined'}**.`
    };
  })
  .build();
