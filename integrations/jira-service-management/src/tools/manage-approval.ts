import { SlateTool } from 'slates';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let manageApprovalTool = SlateTool.create(spec, {
  name: 'Manage Approval',
  key: 'manage_approval',
  description: `View or action approvals on a customer request. Can list pending approvals for a request, or approve/decline a specific approval.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      issueIdOrKey: z.string().describe('Issue key or ID of the customer request'),
      approvalId: z
        .string()
        .optional()
        .describe('Approval ID to approve or decline. Omit to list all approvals.'),
      decision: z
        .enum(['approve', 'decline'])
        .optional()
        .describe('Decision to make on the approval')
    })
  )
  .output(
    z.object({
      approvals: z
        .array(
          z.object({
            approvalId: z.string().describe('Approval ID'),
            name: z.string().optional().describe('Approval name'),
            finalDecision: z
              .string()
              .optional()
              .describe('Final decision status (e.g., "approved", "declined", "pending")'),
            canAnswerApproval: z
              .boolean()
              .optional()
              .describe('Whether the current user can answer this approval'),
            approvers: z
              .array(
                z.object({
                  accountId: z.string().optional(),
                  displayName: z.string().optional(),
                  approverDecision: z.string().optional()
                })
              )
              .optional()
              .describe('List of approvers and their decisions')
          })
        )
        .optional()
        .describe('List of approvals (when listing)'),
      actionedApproval: z
        .object({
          approvalId: z.string(),
          finalDecision: z.string().optional()
        })
        .optional()
        .describe('The approval that was actioned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId
    });

    if (ctx.input.approvalId && ctx.input.decision) {
      let result = await client.answerApproval(
        ctx.input.issueIdOrKey,
        ctx.input.approvalId,
        ctx.input.decision
      );

      return {
        output: {
          actionedApproval: {
            approvalId: String(result.id),
            finalDecision: result.finalDecision
          }
        },
        message: `${ctx.input.decision === 'approve' ? 'Approved' : 'Declined'} approval ${ctx.input.approvalId} on **${ctx.input.issueIdOrKey}**.`
      };
    }

    let result = await client.getApprovals(ctx.input.issueIdOrKey);

    let approvals = (result.values || []).map((a: any) => ({
      approvalId: String(a.id),
      name: a.name,
      finalDecision: a.finalDecision,
      canAnswerApproval: a.canAnswerApproval,
      approvers: a.approvers?.map((approver: any) => ({
        accountId: approver.approver?.accountId,
        displayName: approver.approver?.displayName,
        approverDecision: approver.approverDecision
      }))
    }));

    return {
      output: {
        approvals
      },
      message: `Found **${approvals.length}** approvals on **${ctx.input.issueIdOrKey}**.`
    };
  })
  .build();
