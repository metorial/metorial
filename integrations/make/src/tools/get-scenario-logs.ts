import { SlateTool } from 'slates';
import { z } from 'zod';
import { MakeClient } from '../lib/client';
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
          status: z.string().optional().describe('Execution status'),
          operations: z.number().optional().describe('Operations consumed'),
          duration: z.number().optional().describe('Duration in milliseconds'),
          transfer: z.number().optional().describe('Data transfer in bytes')
        })
      ),
      total: z.number().optional().describe('Total number of log entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MakeClient({
      token: ctx.auth.token,
      zoneUrl: ctx.config.zoneUrl
    });

    let result = await client.getScenarioLogs(ctx.input.scenarioId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let logs = (result.scenarioLogs ?? result.logs ?? result ?? []).map((l: any) => ({
      executionId: l.id ? String(l.id) : l.executionId,
      timestamp: l.timestamp ?? l.created,
      status: l.status,
      operations: l.operations,
      duration: l.duration,
      transfer: l.transfer
    }));

    return {
      output: {
        logs,
        total: result.pg?.total
      },
      message: `Retrieved **${logs.length}** log entries for scenario ${ctx.input.scenarioId}.`
    };
  })
  .build();
