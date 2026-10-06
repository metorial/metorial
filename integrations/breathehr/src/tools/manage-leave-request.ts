import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  dateRange,
  fail,
  readOne,
  requireDate,
  requireId,
  requireText
} from '../lib/response';
import { spec } from '../spec';

export let manageLeaveRequest = SlateTool.create(spec, {
  name: 'Manage Leave Request',
  key: 'manage_leave_request',
  description: `Create, read, approve, or reject a leave request in Breathe HR. Use **action "create"** to submit a new leave request for an employee. Use **action "approve"** or **"reject"** to process an existing leave request. Use action "get" for an exact record. Approval affects leave balances and retains personnel history.`,
  instructions: [
    'When creating a leave request, employeeId, startDate, and endDate are required.',
    'When approving or rejecting, leaveRequestId is required; rejection also requires a reason.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'approve', 'reject'])
        .describe('The action to perform on the leave request'),
      employeeId: z
        .string()
        .optional()
        .describe('Employee ID (required when creating a leave request)'),
      leaveRequestId: z
        .string()
        .optional()
        .describe('Leave request ID (required when approving or rejecting)'),
      startDate: z
        .string()
        .optional()
        .describe('Leave start date (format: YYYY-MM-DD or YYYY/MM/DD, required for create)'),
      endDate: z
        .string()
        .optional()
        .describe('Leave end date (format: YYYY-MM-DD or YYYY/MM/DD, required for create)'),
      leaveType: z
        .enum(['Holiday', 'OtherLeave'])
        .optional()
        .describe('Leave type for create; defaults to Holiday'),
      halfStartAmPm: z
        .enum(['am', 'pm'])
        .optional()
        .describe('Morning or afternoon for a half-day start'),
      halfEndAmPm: z
        .enum(['am', 'pm'])
        .optional()
        .describe('Morning or afternoon for a half-day end'),
      halfDayStart: z.boolean().optional().describe('Whether the start date is a half day'),
      halfDayEnd: z.boolean().optional().describe('Whether the end date is a half day'),
      otherLeaveReasonId: z
        .string()
        .optional()
        .describe(
          'Legacy creation field unsupported by the current endpoint; omit and use leaveType'
        ),
      notes: z.string().optional().describe('Notes for the leave request'),
      reason: z.string().optional().describe('Reason for rejection (used when rejecting)')
    })
  )
  .output(
    z.object({
      leaveRequest: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('The leave request record (returned on create)'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });
    if (ctx.input.action === 'create') {
      if (ctx.input.otherLeaveReasonId !== undefined)
        fail(
          'The current leave creation endpoint does not document otherLeaveReasonId. Omit it and select leaveType Holiday or OtherLeave.'
        );
      const employeeId = requireId(ctx.input.employeeId, 'employeeId');
      const startDate = requireDate(ctx.input.startDate, 'startDate'),
        endDate = requireDate(ctx.input.endDate, 'endDate');
      dateRange(startDate, endDate);
      if (
        (ctx.input.halfStartAmPm && ctx.input.halfDayStart !== true) ||
        (ctx.input.halfEndAmPm && ctx.input.halfDayEnd !== true)
      )
        fail('A morning/afternoon selection requires the corresponding half-day flag.');
      const leaveRequest = readOne(
        await client.employeeCreate('leave_requests', employeeId, 'leave_request', {
          start_date: startDate,
          end_date: endDate,
          half_start: ctx.input.halfDayStart ?? false,
          half_end: ctx.input.halfDayEnd,
          half_start_am_pm: ctx.input.halfStartAmPm,
          half_end_am_pm: ctx.input.halfEndAmPm,
          type: ctx.input.leaveType ?? 'Holiday',
          notes: ctx.input.notes
        }),
        'leave_requests'
      );
      if (
        leaveRequest.start_date !== startDate ||
        leaveRequest.end_date !== endDate ||
        leaveRequest.half_start !== (ctx.input.halfDayStart ?? false) ||
        (ctx.input.halfDayEnd !== undefined &&
          leaveRequest.half_end !== ctx.input.halfDayEnd) ||
        (ctx.input.halfStartAmPm !== undefined &&
          leaveRequest.half_start_am_pm !== ctx.input.halfStartAmPm) ||
        (ctx.input.halfEndAmPm !== undefined &&
          leaveRequest.half_end_am_pm !== ctx.input.halfEndAmPm)
      )
        fail(
          'The leave creation receipt differs from the requested dates or half days. Inspect the request before retrying; personnel history may have changed.'
        );
      return {
        output: { leaveRequest, success: true },
        message:
          'Created the leave request. Approval and cancellation retain personnel history.'
      };
    }
    const leaveRequestId = requireId(ctx.input.leaveRequestId, 'leaveRequestId');
    if (ctx.input.action === 'get')
      return {
        output: {
          leaveRequest: readOne(
            await client.get('leave_requests', leaveRequestId),
            'leave_requests',
            leaveRequestId
          ),
          success: true
        },
        message: 'Retrieved the requested leave record.'
      };
    const reason =
      ctx.input.action === 'reject'
        ? requireText(ctx.input.reason, 'rejection reason')
        : undefined;
    const receipt = readOne(
      await client.action(
        'leave_requests',
        leaveRequestId,
        ctx.input.action,
        reason === undefined ? undefined : { leave_request: { rejection_reason: reason } }
      ),
      'leave_requests',
      leaveRequestId
    );
    const observed = readOne(
      await client.get('leave_requests', leaveRequestId),
      'leave_requests',
      leaveRequestId
    );
    if (
      typeof receipt.status !== 'string' ||
      typeof observed.status !== 'string' ||
      receipt.status.toLowerCase() !== observed.status.toLowerCase() ||
      observed.status.toLowerCase() !==
        (ctx.input.action === 'approve' ? 'approved' : 'rejected')
    )
      fail(
        'The leave decision was not corroborated by the exact record. Inspect the request before retrying; personnel history may have changed.'
      );
    return {
      output: { leaveRequest: observed, success: true },
      message: 'Recorded the leave decision and read back the exact request.'
    };
  })
  .build();
