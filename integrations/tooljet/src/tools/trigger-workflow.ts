import { SlateTool } from 'slates';
import { connection, fail, id, record, z } from '../lib/validation';
import { WorkflowClient } from '../lib/workflow-client';
import { spec } from '../spec';
export const triggerWorkflow = SlateTool.create(spec, {
  name: 'Trigger Workflow',
  key: 'trigger_workflow',
  description:
    'Trigger a configured workflow webhook, start an asynchronous execution, or read its documented status. Workflow Bearer tokens are separate from the configured external API token. Runs may invoke data sources, messages or charges; timeout never means cancellation.',
  instructions: [
    'Copy the exact workflow ID, token and environment from its webhook configuration. No public workflow-discovery endpoint is assumed.',
    'triggerAsync returns workflow_execution_id; pass it unchanged as executionId for status. Routes depend on the deployed ToolJet version and licensed limits.'
  ],
  tags: { destructive: true }
})
  .input(
    z.object({
      workflowId: z.string(),
      workflowToken: z.string(),
      parameters: z.record(z.string(), z.any()).optional(),
      action: z.enum(['trigger', 'triggerAsync', 'status']).optional().default('trigger'),
      environment: z
        .string()
        .optional()
        .describe(
          'Exact environment query value from the copied webhook URL; omit to retain server default.'
        ),
      executionId: z
        .string()
        .optional()
        .describe('Native workflow_execution_id from triggerAsync; required for status.')
    })
  )
  .output(
    z.object({
      response: z.any(),
      workflowId: z.string().optional(),
      executionId: z.string().optional(),
      timestamp: z.string().optional(),
      accepted: z.boolean().optional(),
      completed: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.action !== 'status' && ctx.input.executionId !== undefined)
      fail('executionId is only used by status.');
    const c = connection(ctx.auth, ctx.config),
      result = await new WorkflowClient({ baseUrl: c.baseUrl, secrets: [c.token] }).invoke(
        ctx.input.workflowId,
        ctx.input.workflowToken,
        ctx.input.action,
        ctx.input.parameters,
        ctx.input.environment,
        ctx.input.executionId
      );
    if (ctx.input.action === 'triggerAsync') {
      if (
        !record(result) ||
        typeof result.workflow_execution_id !== 'string' ||
        typeof result.timestamp !== 'string'
      )
        fail(
          'Workflow may have started but its native execution receipt is incomplete. Inspect executions; do not retry blindly.',
          'execution_unverified'
        );
      return {
        output: {
          response: result,
          workflowId: ctx.input.workflowId,
          executionId: id(result.workflow_execution_id, 'execution ID'),
          timestamp: result.timestamp,
          accepted: true,
          completed: false
        },
        message: 'ToolJet accepted the asynchronous run; use status to inspect its execution.'
      };
    }
    return {
      output: {
        response: result,
        workflowId: ctx.input.workflowId,
        executionId: ctx.input.executionId,
        accepted: ctx.input.action === 'trigger' ? true : undefined
      },
      message:
        ctx.input.action === 'status'
          ? 'Returned the native execution status.'
          : 'Returned the synchronous webhook response. Verify external effects before retrying.'
    };
  })
  .build();
