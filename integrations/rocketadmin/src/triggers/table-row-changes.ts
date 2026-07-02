import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { RocketadminClient } from '../lib/client';
import { spec } from '../spec';

export let tableRowChanges = SlateTrigger.create(spec, {
  name: 'Table Row Changes',
  key: 'table_row_changes',
  description:
    'Triggers when rows are created, updated, or deleted in a database table. Polls the connection audit logs for new activity.'
})
  .input(
    z.object({
      logId: z.string().describe('Unique identifier for the log entry'),
      operationType: z
        .string()
        .describe(
          'Type of operation performed (e.g., addRowInTable, updateRowInTable, deleteRowInTable)'
        ),
      tableName: z.string().describe('Name of the affected table'),
      connectionId: z.string().describe('ID of the connection'),
      createdAt: z.string().describe('Timestamp when the change occurred'),
      oldData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Row data before the change'),
      newData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Row data after the change'),
      userId: z.string().optional().describe('ID of the user who made the change')
    })
  )
  .output(
    z.object({
      logId: z.string().describe('Unique identifier for the log entry'),
      tableName: z.string().describe('Name of the affected table'),
      connectionId: z.string().describe('ID of the connection'),
      operationType: z
        .string()
        .describe('Type of operation: addRowInTable, updateRowInTable, deleteRowInTable'),
      createdAt: z.string().describe('Timestamp of the change'),
      oldData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Row data before the change'),
      newData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Row data after the change'),
      userId: z.string().optional().describe('ID of the user who made the change')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new RocketadminClient({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;
      let connectionId = ctx.state?.connectionId as string | undefined;

      if (!connectionId) {
        let connections = await client.listConnections();
        if (connections.length === 0) {
          return { inputs: [], updatedState: { lastPolledAt, connectionId } };
        }
        let firstConnection = connections[0];
        connectionId = String(firstConnection?.id || '');
      }

      let params: Record<string, string | number | undefined> = {};
      if (lastPolledAt) {
        params.dateFrom = lastPolledAt;
      }

      let result = await client.getConnectionLogs(connectionId, {
        dateFrom: lastPolledAt,
        perPage: 100
      });

      let logs: Record<string, unknown>[] = [];
      if (Array.isArray(result)) {
        logs = result;
      } else if (result.logs && Array.isArray(result.logs)) {
        logs = result.logs as Record<string, unknown>[];
      }

      let rowOperations = ['addRowInTable', 'updateRowInTable', 'deleteRowInTable'];
      let relevantLogs = logs.filter(log => {
        let opType = String(log.operationType || log.operation_type || '');
        return rowOperations.includes(opType);
      });

      let newLastPolledAt = lastPolledAt;
      if (relevantLogs.length > 0) {
        let latestTimestamp = relevantLogs.reduce((latest, log) => {
          let ts = String(log.createdAt || log.created_at || '');
          return ts > latest ? ts : latest;
        }, lastPolledAt || '');
        if (latestTimestamp) {
          newLastPolledAt = latestTimestamp;
        }
      }

      let inputs = relevantLogs.map(log => ({
        logId: String(log.id || log.logId || ''),
        operationType: String(log.operationType || log.operation_type || ''),
        tableName: String(log.tableName || log.table_name || ''),
        connectionId: connectionId as string,
        createdAt: String(log.createdAt || log.created_at || ''),
        oldData: (log.old_data || log.oldData) as Record<string, unknown> | undefined,
        newData: (log.new_data || log.newData) as Record<string, unknown> | undefined,
        userId: log.userId ? String(log.userId) : log.user_id ? String(log.user_id) : undefined
      }));

      return {
        inputs,
        updatedState: {
          lastPolledAt: newLastPolledAt || new Date().toISOString(),
          connectionId
        }
      };
    },

    handleEvent: async ctx => {
      let operationMap: Record<string, string> = {
        addRowInTable: 'row.created',
        updateRowInTable: 'row.updated',
        deleteRowInTable: 'row.deleted'
      };

      let eventType =
        operationMap[ctx.input.operationType] || `row.${ctx.input.operationType}`;

      return {
        type: eventType,
        id: ctx.input.logId,
        output: {
          logId: ctx.input.logId,
          tableName: ctx.input.tableName,
          connectionId: ctx.input.connectionId,
          operationType: ctx.input.operationType,
          createdAt: ctx.input.createdAt,
          oldData: ctx.input.oldData,
          newData: ctx.input.newData,
          userId: ctx.input.userId
        }
      };
    }
  })
  .build();
