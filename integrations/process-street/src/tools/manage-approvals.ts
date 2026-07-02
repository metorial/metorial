import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let approvalSchema = z.object({
  approvalId: z.string().describe('ID of the approval'),
  approvalTaskId: z.string().describe('ID of the approval task'),
  subjectTaskId: z.string().describe('ID of the task being reviewed'),
  status: z.string().describe('Approval status: Approved or Rejected'),
  comment: z.string().optional().describe('Review comment'),
  reviewedByEmail: z.string().optional().describe('Email of the reviewer'),
  reviewedByUsername: z.string().optional().describe('Username of the reviewer')
});

export let manageApprovals = SlateTool.create(spec, {
  name: 'Manage Approvals',
  key: 'manage_approvals',
  description: `List, approve, or reject approval tasks in a workflow run. Approval tasks are special tasks used to approve or reject the work in another task.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workflowRunId: z.string().describe('ID of the workflow run'),
      action: z.enum(['list', 'approve', 'reject']).describe('Action to perform'),
      approvalTaskId: z
        .string()
        .optional()
        .describe('ID of the approval task (required for approve/reject)'),
      subjectTaskId: z
        .string()
        .optional()
        .describe('ID of the task being reviewed (optional for approve/reject)'),
      comment: z.string().optional().describe('Optional comment for the approval or rejection')
    })
  )
  .output(
    z.object({
      approvals: z
        .array(approvalSchema)
        .optional()
        .describe('List of approvals (for list action)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { workflowRunId, action, approvalTaskId, subjectTaskId, comment } = ctx.input;

    if (action === 'list') {
      let data = await client.listApprovals(workflowRunId);
      let approvals = (data.approvals || []).map((a: any) => ({
        approvalId: a.id,
        approvalTaskId: a.approvalTaskId,
        subjectTaskId: a.subjectTaskId,
        status: a.status,
        comment: a.comment,
        reviewedByEmail: a.reviewedBy?.email,
        reviewedByUsername: a.reviewedBy?.username
      }));
      return {
        output: { approvals, success: true },
        message: `Found **${approvals.length}** approval(s).`
      };
    }

    if (!approvalTaskId) {
      throw new Error('approvalTaskId is required for approve/reject actions');
    }

    let status = action === 'approve' ? 'Approved' : 'Rejected';
    await client.upsertApproval(workflowRunId, {
      approvalTaskId,
      status,
      subjectTaskId,
      comment
    });

    return {
      output: { success: true },
      message: `**${status}** approval task **${approvalTaskId}**${comment ? ` with comment: "${comment}"` : ''}.`
    };
  })
  .build();
