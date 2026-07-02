import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { SnowflakeClient } from '../lib/client';
import { spec } from '../spec';

export let taskRunCompleted = SlateTrigger.create(spec, {
  name: 'Task Run Completed',
  key: 'task_run_completed',
  description:
    'Triggers when a scheduled Snowflake task completes a run. Polls the task history to detect task run completions, including both successful and failed runs.'
})
  .input(
    z.object({
      runId: z.string().describe('Unique identifier for the task run'),
      taskName: z.string().describe('Name of the task'),
      databaseName: z.string().describe('Database containing the task'),
      schemaName: z.string().describe('Schema containing the task'),
      state: z.string().describe('Run state (e.g. SUCCEEDED, FAILED, CANCELLED)'),
      errorCode: z.string().optional().describe('Error code if the run failed'),
      errorMessage: z.string().optional().describe('Error message if the run failed'),
      queryStartTime: z.string().optional().describe('When the task query started'),
      completedTime: z.string().optional().describe('When the task run completed'),
      queryId: z.string().optional().describe('Query ID of the task execution'),
      scheduledTime: z.string().optional().describe('When the task was scheduled to run')
    })
  )
  .output(
    z.object({
      runId: z.string().describe('Task run identifier'),
      taskName: z.string().describe('Task name'),
      databaseName: z.string().describe('Database'),
      schemaName: z.string().describe('Schema'),
      state: z.string().describe('Execution state'),
      errorCode: z.string().optional().describe('Error code if failed'),
      errorMessage: z.string().optional().describe('Error message if failed'),
      queryStartTime: z.string().optional().describe('Query start time'),
      completedTime: z.string().optional().describe('Completion time'),
      queryId: z.string().optional().describe('Query ID'),
      scheduledTime: z.string().optional().describe('Scheduled time')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new SnowflakeClient({
        accountIdentifier: ctx.config.accountIdentifier,
        token: ctx.auth.token,
        tokenType: ctx.auth.tokenType
      });

      let lastPollTime = (ctx.state as any)?.lastPollTime as string | undefined;
      let now = new Date().toISOString();

      let timeFilter = lastPollTime
        ? `DATEADD('second', -${SlateDefaultPollingIntervalSeconds * 2}, '${lastPollTime}'::TIMESTAMP_LTZ)`
        : `DATEADD('minute', -10, CURRENT_TIMESTAMP())`;

      let statement = `SELECT
        RUN_ID, NAME, DATABASE_NAME, SCHEMA_NAME, STATE,
        ERROR_CODE, ERROR_MESSAGE, QUERY_START_TIME, COMPLETED_TIME,
        QUERY_ID, SCHEDULED_TIME
      FROM TABLE(INFORMATION_SCHEMA.TASK_HISTORY(
        RESULT_LIMIT => 100,
        SCHEDULED_TIME_RANGE_START => ${timeFilter}
      ))
      WHERE STATE != 'SCHEDULED'
      ORDER BY COMPLETED_TIME DESC`;

      let result = await client.executeStatement({
        statement,
        warehouse: ctx.config.warehouse,
        role: ctx.config.role
      });

      let inputs = (result.data || []).map(row => ({
        runId: row[0] || `${row[1]}-${row[7]}`,
        taskName: row[1] || '',
        databaseName: row[2] || '',
        schemaName: row[3] || '',
        state: row[4] || '',
        errorCode: row[5] || undefined,
        errorMessage: row[6] || undefined,
        queryStartTime: row[7] || undefined,
        completedTime: row[8] || undefined,
        queryId: row[9] || undefined,
        scheduledTime: row[10] || undefined
      }));

      return {
        inputs,
        updatedState: {
          lastPollTime: now
        }
      };
    },

    handleEvent: async ctx => {
      let stateLower = (ctx.input.state || '').toLowerCase();
      let eventType =
        stateLower === 'succeeded'
          ? 'task_run.succeeded'
          : stateLower === 'failed'
            ? 'task_run.failed'
            : `task_run.${stateLower}`;

      return {
        type: eventType,
        id: ctx.input.runId,
        output: {
          runId: ctx.input.runId,
          taskName: ctx.input.taskName,
          databaseName: ctx.input.databaseName,
          schemaName: ctx.input.schemaName,
          state: ctx.input.state,
          errorCode: ctx.input.errorCode,
          errorMessage: ctx.input.errorMessage,
          queryStartTime: ctx.input.queryStartTime,
          completedTime: ctx.input.completedTime,
          queryId: ctx.input.queryId,
          scheduledTime: ctx.input.scheduledTime
        }
      };
    }
  })
  .build();
