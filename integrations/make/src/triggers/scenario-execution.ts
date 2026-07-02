import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { MakeClient } from '../lib/client';
import { spec } from '../spec';

export let scenarioExecution = SlateTrigger.create(spec, {
  name: 'Scenario Execution',
  key: 'scenario_execution',
  description:
    'Triggers when scenarios are executed. Polls for new execution log entries across one or more scenarios within a team.'
})
  .input(
    z.object({
      scenarioId: z.number().describe('Scenario ID that was executed'),
      executionId: z.string().describe('Unique execution identifier'),
      status: z.string().optional().describe('Execution status'),
      timestamp: z.string().optional().describe('Execution timestamp'),
      operations: z.number().optional().describe('Operations consumed'),
      duration: z.number().optional().describe('Duration in milliseconds'),
      transfer: z.number().optional().describe('Data transfer in bytes')
    })
  )
  .output(
    z.object({
      scenarioId: z.number().describe('Scenario ID that was executed'),
      executionId: z.string().describe('Unique execution identifier'),
      status: z
        .string()
        .optional()
        .describe('Execution status (e.g. success, warning, error)'),
      timestamp: z.string().optional().describe('When the execution occurred'),
      operations: z.number().optional().describe('Number of operations consumed'),
      duration: z.number().optional().describe('Execution duration in milliseconds'),
      transfer: z.number().optional().describe('Data transfer in bytes')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new MakeClient({
        token: ctx.auth.token,
        zoneUrl: ctx.config.zoneUrl
      });

      let state = ctx.state as {
        lastSeenIds?: Record<string, string>;
        scenarioIds?: number[];
      } | null;
      let lastSeenIds = state?.lastSeenIds ?? {};
      let scenarioIds = state?.scenarioIds ?? [];

      // If no scenario IDs in state, discover them from organizations/teams
      if (scenarioIds.length === 0) {
        try {
          let orgResult = await client.listOrganizations();
          let orgs = orgResult.organizations ?? orgResult ?? [];
          for (let org of orgs) {
            let teamsResult = await client.listTeams(org.id, { limit: 10 });
            let teams = teamsResult.teams ?? teamsResult ?? [];
            for (let team of teams) {
              let scenResult = await client.listScenarios({ teamId: team.id, limit: 50 });
              let scenarios = scenResult.scenarios ?? scenResult ?? [];
              for (let s of scenarios) {
                scenarioIds.push(s.id);
              }
            }
          }
        } catch {
          // If discovery fails, return empty
          return { inputs: [], updatedState: { lastSeenIds, scenarioIds } };
        }
      }

      let inputs: Array<{
        scenarioId: number;
        executionId: string;
        status?: string;
        timestamp?: string;
        operations?: number;
        duration?: number;
        transfer?: number;
      }> = [];

      let updatedLastSeenIds: Record<string, string> = { ...lastSeenIds };

      for (let scenarioId of scenarioIds.slice(0, 20)) {
        try {
          let result = await client.getScenarioLogs(scenarioId, { limit: 10 });
          let logs = result.scenarioLogs ?? result.logs ?? result ?? [];

          if (!Array.isArray(logs)) continue;

          let lastSeen = lastSeenIds[String(scenarioId)];
          let newestId: string | undefined;

          for (let log of logs) {
            let logId = String(log.id ?? log.executionId ?? '');
            if (!logId) continue;

            if (!newestId) newestId = logId;

            if (lastSeen && logId <= lastSeen) break;

            inputs.push({
              scenarioId,
              executionId: logId,
              status: log.status,
              timestamp: log.timestamp ?? log.created,
              operations: log.operations,
              duration: log.duration,
              transfer: log.transfer
            });
          }

          if (newestId) {
            updatedLastSeenIds[String(scenarioId)] = newestId;
          }
        } catch {}
      }

      return {
        inputs,
        updatedState: {
          lastSeenIds: updatedLastSeenIds,
          scenarioIds
        }
      };
    },

    handleEvent: async ctx => {
      let status = ctx.input.status ?? 'unknown';
      return {
        type: `scenario.${status}`,
        id: `${ctx.input.scenarioId}-${ctx.input.executionId}`,
        output: {
          scenarioId: ctx.input.scenarioId,
          executionId: ctx.input.executionId,
          status: ctx.input.status,
          timestamp: ctx.input.timestamp,
          operations: ctx.input.operations,
          duration: ctx.input.duration,
          transfer: ctx.input.transfer
        }
      };
    }
  })
  .build();
