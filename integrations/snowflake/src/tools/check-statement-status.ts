import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnowflakeClient } from '../lib/client';
import { spec } from '../spec';

export let checkStatementStatus = SlateTool.create(spec, {
  name: 'Check Statement Status',
  key: 'check_statement_status',
  description: `Check the execution status of a previously submitted SQL statement and retrieve its results. Use this after submitting an asynchronous query to poll for completion and fetch result data, or to retrieve additional result partitions for large result sets.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      statementHandle: z
        .string()
        .describe('Statement handle returned from a previous SQL execution'),
      partition: z
        .number()
        .optional()
        .describe('Partition number to retrieve for large result sets (0-indexed)')
    })
  )
  .output(
    z.object({
      statementHandle: z.string().describe('Statement handle'),
      status: z.string().describe('Current execution status'),
      completed: z.boolean().describe('Whether the statement has finished executing'),
      columns: z
        .array(
          z.object({
            name: z.string(),
            type: z.string(),
            nullable: z.boolean()
          })
        )
        .optional()
        .describe('Column metadata'),
      rows: z.array(z.array(z.string().nullable())).optional().describe('Result rows'),
      rowCount: z.number().optional().describe('Total number of rows'),
      partitionCount: z.number().optional().describe('Number of result partitions'),
      stats: z
        .object({
          numRowsInserted: z.number().optional(),
          numRowsUpdated: z.number().optional(),
          numRowsDeleted: z.number().optional(),
          numDuplicateRowsUpdated: z.number().optional()
        })
        .optional()
        .describe('DML statistics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnowflakeClient({
      accountIdentifier: ctx.config.accountIdentifier,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let result = await client.getStatementStatus(
      ctx.input.statementHandle,
      ctx.input.partition
    );

    let completed = result.httpStatus !== 202;

    let columns = result.resultSetMetaData?.rowType?.map(col => ({
      name: col.name,
      type: col.type,
      nullable: col.nullable
    }));

    let rows = result.data?.map(row => row.map(v => v ?? null));
    let partitionCount = result.resultSetMetaData?.partitionInfo?.length;

    let statusText = completed
      ? `Statement completed. ${result.resultSetMetaData?.numRows ?? 0} rows returned.`
      : 'Statement still executing...';

    return {
      output: {
        statementHandle: result.statementHandle,
        status: result.message || statusText,
        completed,
        columns,
        rows,
        rowCount: result.resultSetMetaData?.numRows,
        partitionCount,
        stats: result.stats
      },
      message: `**Status**: ${statusText}`
    };
  })
  .build();
