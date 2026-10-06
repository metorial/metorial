import { SlateTool } from 'slates';
import { clientFor } from '../lib/client';
import { execution, executionId, id, z } from '../lib/schemas';
import { spec } from '../spec';

export const getExecutionStatus = SlateTool.create(spec, {
  key: 'get_execution_status',
  name: 'Get Execution Status',
  description:
    'Read native status and available outputs for one existing scenario execution. RUNNING or PAUSED is incomplete; reading does not resume, stop, or resend an execution. Prior external effects and charges remain.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      scenarioId: id.describe('Exact scenario ID from list_scenarios.'),
      executionId
    })
  )
  .output(execution.extend({ scenarioId: id, executionId }))
  .handleInvocation(async ctx => {
    const result = await clientFor(ctx).getExecution(
      ctx.input.scenarioId,
      ctx.input.executionId
    );
    return {
      output: {
        ...result,
        scenarioId: ctx.input.scenarioId,
        executionId: ctx.input.executionId
      },
      message: `Native execution status: ${result.status}.`
    };
  })
  .build();
