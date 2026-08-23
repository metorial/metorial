import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { circleCiValidationError } from '../lib/validation';
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
    destructive: true,
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
      jobs: z
        .array(z.string())
        .min(1)
        .optional()
        .describe('Job UUIDs to rerun (mutually exclusive with fromFailed)'),
      sparseTree: z
        .boolean()
        .optional()
        .describe(
          'Use sparse-tree rerun logic; requires jobs and cannot be used with fromFailed'
        ),
      enableSsh: z
        .boolean()
        .optional()
        .describe(
          'Enable SSH on rerun jobs; requires jobs and cannot be used with fromFailed'
        ),
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
      message: z.string(),
      workflowId: z
        .string()
        .optional()
        .describe('New workflow UUID for a rerun; otherwise the target workflow UUID')
    })
  )
  .handleInvocation(async ctx => {
    let hasRerunOptions =
      ctx.input.fromFailed !== undefined ||
      ctx.input.jobs !== undefined ||
      ctx.input.sparseTree !== undefined ||
      ctx.input.enableSsh !== undefined;
    if (hasRerunOptions && ctx.input.action !== 'rerun') {
      throw circleCiValidationError(
        'fromFailed, jobs, sparseTree, and enableSsh are only supported for rerun.'
      );
    }
    if (ctx.input.approvalRequestId && ctx.input.action !== 'approve') {
      throw circleCiValidationError('approvalRequestId is only supported for approve.');
    }
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'cancel') {
      let result = await client.cancelWorkflow(ctx.input.workflowId);
      return {
        output: {
          success: true,
          message: result.message || 'Workflow cancelled successfully.',
          workflowId: ctx.input.workflowId
        },
        message: `Workflow \`${ctx.input.workflowId}\` has been **cancelled**.`
      };
    }

    if (ctx.input.action === 'rerun') {
      if (ctx.input.fromFailed !== undefined && ctx.input.jobs !== undefined) {
        throw circleCiValidationError('fromFailed and jobs are mutually exclusive.');
      }
      if (
        (ctx.input.sparseTree !== undefined || ctx.input.enableSsh !== undefined) &&
        !ctx.input.jobs
      ) {
        throw circleCiValidationError('sparseTree and enableSsh require jobs.');
      }
      let result = await client.rerunWorkflow(ctx.input.workflowId, {
        fromFailed: ctx.input.fromFailed,
        jobs: ctx.input.jobs,
        sparseTree: ctx.input.sparseTree,
        enableSsh: ctx.input.enableSsh
      });
      let msg = ctx.input.fromFailed
        ? 'rerun from failed jobs'
        : ctx.input.jobs
          ? `rerun of ${ctx.input.jobs.length} selected job(s)`
          : 'rerun';
      return {
        output: {
          success: true,
          message: result.message || `Workflow ${msg} initiated successfully.`,
          workflowId: result.workflow_id
        },
        message: `Workflow \`${ctx.input.workflowId}\` has been **${msg}**.`
      };
    }

    if (ctx.input.action === 'approve') {
      if (!ctx.input.approvalRequestId) {
        throw circleCiValidationError('approvalRequestId is required for the approve action.');
      }
      let result = await client.approveWorkflowJob(
        ctx.input.workflowId,
        ctx.input.approvalRequestId
      );
      return {
        output: {
          success: true,
          message: result.message || 'Approval job approved successfully.',
          workflowId: ctx.input.workflowId
        },
        message: `Approval job \`${ctx.input.approvalRequestId}\` in workflow \`${ctx.input.workflowId}\` has been **approved**.`
      };
    }

    throw circleCiValidationError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
