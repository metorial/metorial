import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { paging } from '../lib/schemas';
import { spec } from '../spec';

export let getScenarioLogs = SlateTool.create(spec, {
  name: 'Get Scenario Logs',
  key: 'get_scenario_logs',
  description: `Retrieve execution logs for a specific scenario. Shows recent execution history including timestamps, statuses, and operations consumed. Useful for debugging and monitoring scenario performance.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scenarioId: z.number().describe('ID of the scenario to get logs for'),
      limit: z.number().optional().describe('Maximum number of log entries to return'),
      offset: z.number().optional().describe('Number to skip for pagination')
    })
  )
  .output(
    z.object({
      logs: z.array(
        z.object({
          executionId: z.string().optional().describe('Execution ID'),
          timestamp: z.string().optional().describe('Execution timestamp'),
          nativeStatus: z
            .number()
            .optional()
            .describe('Native status code: 1 success, 2 warning, 3 error.'),
          eventType: z.string().optional(),
          resumeAt: z.string().optional(),
          interruptReason: z.string().optional(),
          status: z.string().optional().describe('Execution status'),
          operations: z.number().optional().describe('Operations consumed'),
          duration: z.number().optional().describe('Duration in milliseconds'),
          transfer: z.number().optional().describe('Data transfer in bytes')
        })
      ),
      page: paging.optional(),
      total: z.number().optional().describe('Total number of log entries')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    const result = await client.getScenarioLogs(ctx.input.scenarioId, ctx.input);
    const logs = result.scenarioLogs.map(l => ({
      executionId: l.id,
      timestamp: l.timestamp,
      status: l.status === undefined ? undefined : String(l.status),
      nativeStatus: l.status,
      operations: l.operations,
      duration: l.duration,
      transfer: l.transfer,
      eventType: l.eventType,
      resumeAt: l.resumeAt,
      interruptReason: l.interruptReason
    }));
    return {
      output: { logs, page: result.pg },
      message: `Returned ${logs.length} native log events. Numeric status codes are preserved as strings; parked events can have no status.`
    };
  })
  .build();
