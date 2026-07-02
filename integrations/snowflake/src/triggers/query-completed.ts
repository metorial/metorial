import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { SnowflakeClient } from '../lib/client';
import { spec } from '../spec';

export let queryCompleted = SlateTrigger.create(spec, {
  name: 'Query Completed',
  key: 'query_completed',
  description:
    'Triggers when SQL queries complete execution in the Snowflake account. Polls the query history to detect newly completed queries including both successful and failed executions.'
})
  .input(
    z.object({
      queryId: z.string().describe('Unique query identifier'),
      queryText: z.string().describe('The SQL statement that was executed'),
      status: z.string().describe('Execution status (e.g. SUCCESS, FAILED_WITH_ERROR)'),
      errorCode: z.string().optional().describe('Error code if the query failed'),
      errorMessage: z.string().optional().describe('Error message if the query failed'),
      warehouseName: z.string().optional().describe('Warehouse that executed the query'),
      databaseName: z.string().optional().describe('Database context of the query'),
      schemaName: z.string().optional().describe('Schema context of the query'),
      userName: z.string().optional().describe('User who submitted the query'),
      roleName: z.string().optional().describe('Role used to execute the query'),
      executionStartedAt: z.string().optional().describe('Timestamp when execution started'),
      executionEndedAt: z.string().optional().describe('Timestamp when execution ended'),
      totalElapsedMs: z.number().optional().describe('Total elapsed time in milliseconds'),
      rowsProduced: z.number().optional().describe('Number of rows produced by the query'),
      bytesScanned: z.number().optional().describe('Number of bytes scanned by the query')
    })
  )
  .output(
    z.object({
      queryId: z.string().describe('Unique query identifier'),
      queryText: z.string().describe('SQL statement that was executed'),
      status: z.string().describe('Execution result status'),
      errorCode: z.string().optional().describe('Error code if failed'),
      errorMessage: z.string().optional().describe('Error message if failed'),
      warehouseName: z.string().optional().describe('Warehouse used'),
      databaseName: z.string().optional().describe('Database context'),
      schemaName: z.string().optional().describe('Schema context'),
      userName: z.string().optional().describe('User who ran the query'),
      roleName: z.string().optional().describe('Role used'),
      executionStartedAt: z.string().optional().describe('When execution started'),
      executionEndedAt: z.string().optional().describe('When execution ended'),
      totalElapsedMs: z.number().optional().describe('Elapsed time in milliseconds'),
      rowsProduced: z.number().optional().describe('Rows produced'),
      bytesScanned: z.number().optional().describe('Bytes scanned')
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

      let whereClause = lastPollTime
        ? `WHERE END_TIME >= '${lastPollTime}'`
        : `WHERE END_TIME >= DATEADD('minute', -10, CURRENT_TIMESTAMP())`;

      let statement = `SELECT
        QUERY_ID, QUERY_TEXT, EXECUTION_STATUS, ERROR_CODE, ERROR_MESSAGE,
        WAREHOUSE_NAME, DATABASE_NAME, SCHEMA_NAME, USER_NAME, ROLE_NAME,
        START_TIME, END_TIME, TOTAL_ELAPSED_TIME, ROWS_PRODUCED, BYTES_SCANNED
      FROM TABLE(INFORMATION_SCHEMA.QUERY_HISTORY())
      ${whereClause}
      ORDER BY END_TIME DESC
      LIMIT 100`;

      let result = await client.executeStatement({
        statement,
        warehouse: ctx.config.warehouse,
        role: ctx.config.role
      });

      let inputs = (result.data || []).map(row => ({
        queryId: row[0] || '',
        queryText: row[1] || '',
        status: row[2] || '',
        errorCode: row[3] || undefined,
        errorMessage: row[4] || undefined,
        warehouseName: row[5] || undefined,
        databaseName: row[6] || undefined,
        schemaName: row[7] || undefined,
        userName: row[8] || undefined,
        roleName: row[9] || undefined,
        executionStartedAt: row[10] || undefined,
        executionEndedAt: row[11] || undefined,
        totalElapsedMs: row[12] ? Number.parseInt(row[12], 10) : undefined,
        rowsProduced: row[13] ? Number.parseInt(row[13], 10) : undefined,
        bytesScanned: row[14] ? Number.parseInt(row[14], 10) : undefined
      }));

      return {
        inputs,
        updatedState: {
          lastPollTime: now
        }
      };
    },

    handleEvent: async ctx => {
      let statusLower = (ctx.input.status || '').toLowerCase();
      let eventType =
        statusLower.includes('fail') || statusLower.includes('error')
          ? 'query.failed'
          : 'query.completed';

      return {
        type: eventType,
        id: ctx.input.queryId,
        output: {
          queryId: ctx.input.queryId,
          queryText: ctx.input.queryText,
          status: ctx.input.status,
          errorCode: ctx.input.errorCode,
          errorMessage: ctx.input.errorMessage,
          warehouseName: ctx.input.warehouseName,
          databaseName: ctx.input.databaseName,
          schemaName: ctx.input.schemaName,
          userName: ctx.input.userName,
          roleName: ctx.input.roleName,
          executionStartedAt: ctx.input.executionStartedAt,
          executionEndedAt: ctx.input.executionEndedAt,
          totalElapsedMs: ctx.input.totalElapsedMs,
          rowsProduced: ctx.input.rowsProduced,
          bytesScanned: ctx.input.bytesScanned
        }
      };
    }
  })
  .build();
