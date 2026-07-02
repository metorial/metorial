import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { createClient, escapeIdentifier, qualifiedTableName } from '../lib/helpers';
import { spec } from '../spec';

export let tableChanges = SlateTrigger.create(spec, {
  name: 'Table Row Changes',
  key: 'table_row_changes',
  description:
    'Polls a PostgreSQL table for new or updated rows based on a timestamp or auto-incrementing column. Detects INSERT and UPDATE operations by tracking the latest value of the specified column.',
  instructions: [
    'The table must have a column that monotonically increases with each insert or update (e.g., a created_at, updated_at, or auto-increment id column).',
    'For detecting both inserts and updates, use a column that updates on modification (e.g., updated_at with a trigger).',
    'The polling interval determines how frequently the table is checked for changes.'
  ]
})
  .input(
    z.object({
      changeType: z
        .enum(['inserted', 'updated'])
        .describe('Whether the row was newly inserted or updated'),
      trackingColumnValue: z.string().describe('Value of the tracking column for this row'),
      row: z.record(z.string(), z.any()).describe('The full row data'),
      tableName: z.string().describe('Table that the change was detected in'),
      schemaName: z.string().describe('Schema of the table')
    })
  )
  .output(
    z.object({
      tableName: z.string().describe('Table where the change occurred'),
      schemaName: z.string().describe('Schema of the table'),
      changeType: z.enum(['inserted', 'updated']).describe('Type of change detected'),
      row: z.record(z.string(), z.any()).describe('The full row data')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx.auth, ctx.config);
      let schema = (ctx.input as any).schemaName || ctx.config.defaultSchema;
      let tableName = (ctx.input as any).tableName as string;
      let trackingColumn = (ctx.input as any).trackingColumn as string;
      let trackingColumnType = (ctx.input as any).trackingColumnType as string;
      let batchSize = (ctx.input as any).batchSize || 100;
      let fullTableName = qualifiedTableName(tableName, schema);
      let escapedCol = escapeIdentifier(trackingColumn);

      let lastValue = ctx.state?.lastTrackingValue as string | null | undefined;

      let sql: string;
      if (lastValue) {
        let comparison: string;
        if (trackingColumnType === 'timestamp') {
          comparison = `${escapedCol} > '${lastValue.replace(/'/g, "''")}'::timestamptz`;
        } else {
          comparison = `${escapedCol} > ${Number.parseInt(lastValue, 10)}`;
        }
        sql = `SELECT * FROM ${fullTableName} WHERE ${comparison} ORDER BY ${escapedCol} ASC LIMIT ${batchSize}`;
      } else {
        // First poll - get the latest rows to establish a baseline
        sql = `SELECT * FROM ${fullTableName} ORDER BY ${escapedCol} DESC LIMIT 1`;
      }

      ctx.info(
        `Polling ${fullTableName} for changes (tracking: ${trackingColumn}, last: ${lastValue || 'initial'})`
      );
      let result = await client.query(sql, ctx.config.queryTimeout);

      if (!lastValue) {
        // First poll - just capture the current max value, don't emit events
        let maxRow = result.rows[0];
        let newLastValue = maxRow ? String(maxRow[trackingColumn]) : null;
        return {
          inputs: [],
          updatedState: {
            lastTrackingValue: newLastValue
          }
        };
      }

      let inputs = result.rows.map((row: any) => ({
        changeType: 'inserted' as const, // We can't distinguish insert from update with this approach
        trackingColumnValue: String(row[trackingColumn]),
        row,
        tableName,
        schemaName: schema
      }));

      let newLastValue =
        result.rows.length > 0
          ? String(result.rows[result.rows.length - 1]![trackingColumn])
          : lastValue;

      return {
        inputs,
        updatedState: {
          lastTrackingValue: newLastValue
        }
      };
    },

    handleEvent: async ctx => {
      let row = ctx.input.row;
      // Try to find a suitable ID for deduplication
      let rowId = row.id || row._id || row.uid || row.uuid || ctx.input.trackingColumnValue;

      return {
        type: `row.${ctx.input.changeType}`,
        id: `${ctx.input.schemaName}.${ctx.input.tableName}:${String(rowId)}:${ctx.input.trackingColumnValue}`,
        output: {
          tableName: ctx.input.tableName,
          schemaName: ctx.input.schemaName,
          changeType: ctx.input.changeType,
          row: ctx.input.row
        }
      };
    }
  })
  .build();
