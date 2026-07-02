import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageWorkflow = SlateTool.create(spec, {
  name: 'Manage Workflow',
  key: 'manage_workflow',
  description: `Cancel, rerun, or approve a pending job within a workflow. Use this to control workflow execution — stop a running workflow, rerun it (optionally from failed jobs only), or approve a held approval job.`,
  instructions: [
    'For approval, provide the approvalRequestId from the job details (available via Get Workflow tool).',
    'When rerunning from failed, only the failed jobs and their downstream dependencies will be rerun.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      workflowId: z.string().describe('The UUID of the workflow'),
      action: z
        .enum(['cancel', 'rerun', 'approve'])
        .describe('Action to perform on the workflow'),
      fromFailed: z
        .boolean()
        .optional()
        .describe('When rerunning, only rerun from failed jobs'),
      approvalRequestId: z
        .string()
        .optional()
        .describe(
          'The approval request ID of the job to approve (required for approve action)'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      message: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'cancel') {
      await client.cancelWorkflow(ctx.input.workflowId);
      return {
        output: { success: true, message: 'Workflow cancelled successfully.' },
        message: `Workflow \`${ctx.input.workflowId}\` has been **cancelled**.`
      };
    }

    if (ctx.input.action === 'rerun') {
      await client.rerunWorkflow(ctx.input.workflowId, {
        fromFailed: ctx.input.fromFailed
      });
      let msg = ctx.input.fromFailed ? 'rerun from failed jobs' : 'rerun';
      return {
        output: { success: true, message: `Workflow ${msg} initiated successfully.` },
        message: `Workflow \`${ctx.input.workflowId}\` has been **${msg}**.`
      };
    }

    if (ctx.input.action === 'approve') {
      if (!ctx.input.approvalRequestId) {
        throw new Error('approvalRequestId is required for the approve action.');
      }
      await client.approveWorkflowJob(ctx.input.workflowId, ctx.input.approvalRequestId);
      return {
        output: { success: true, message: 'Approval job approved successfully.' },
        message: `Approval job \`${ctx.input.approvalRequestId}\` in workflow \`${ctx.input.workflowId}\` has been **approved**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
