import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLeaveRequest = SlateTool.create(spec, {
  name: 'Manage Leave Request',
  key: 'manage_leave_request',
  description: `Create, approve, or reject a leave request in Breathe HR. Use **action "create"** to submit a new leave request for an employee. Use **action "approve"** or **"reject"** to process an existing leave request.`,
  instructions: [
    'When creating a leave request, employeeId, startDate, and endDate are required.',
    'When approving or rejecting, only leaveRequestId is required. Provide a reason when rejecting.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'approve', 'reject'])
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
        .describe('Leave start date (format: YYYY/MM/DD, required for create)'),
      endDate: z
        .string()
        .optional()
        .describe('Leave end date (format: YYYY/MM/DD, required for create)'),
      halfDayStart: z.boolean().optional().describe('Whether the start date is a half day'),
      halfDayEnd: z.boolean().optional().describe('Whether the end date is a half day'),
      otherLeaveReasonId: z
        .string()
        .optional()
        .describe('ID of the other leave reason (for non-holiday leave)'),
      notes: z.string().optional().describe('Notes for the leave request'),
      reason: z.string().optional().describe('Reason for rejection (used when rejecting)')
    })
  )
  .output(
    z.object({
      leaveRequest: z
        .record(z.string(), z.any())
        .optional()
        .describe('The leave request record (returned on create)'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.employeeId)
        throw new Error('employeeId is required when creating a leave request');
      if (!ctx.input.startDate)
        throw new Error('startDate is required when creating a leave request');
      if (!ctx.input.endDate)
        throw new Error('endDate is required when creating a leave request');

      let result = await client.createLeaveRequest(ctx.input.employeeId, {
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        halfDayStart: ctx.input.halfDayStart,
        halfDayEnd: ctx.input.halfDayEnd,
        otherLeaveReasonId: ctx.input.otherLeaveReasonId,
        notes: ctx.input.notes
      });

      let leaveRequest = result?.leave_requests?.[0] || result?.leave_request || result;

      return {
        output: { leaveRequest, success: true },
        message: `Created leave request for employee **${ctx.input.employeeId}** from ${ctx.input.startDate} to ${ctx.input.endDate}.`
      };
    }

    if (!ctx.input.leaveRequestId)
      throw new Error('leaveRequestId is required when approving or rejecting');

    if (ctx.input.action === 'approve') {
      await client.approveLeaveRequest(ctx.input.leaveRequestId);
      return {
        output: { success: true },
        message: `Approved leave request **${ctx.input.leaveRequestId}**.`
      };
    }

    await client.rejectLeaveRequest(ctx.input.leaveRequestId, ctx.input.reason);
    return {
      output: { success: true },
      message: `Rejected leave request **${ctx.input.leaveRequestId}**.`
    };
  })
  .build();
