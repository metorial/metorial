import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let getTableData = SlateTool.create(spec, {
  name: 'Get Employee Table Data',
  key: 'get_table_data',
  description: `Retrieve tabular data for an employee. Tables include job history, compensation, education, and other structured data. Use the **Get Account Metadata** tool to discover available table names.`,
  instructions: [
    'Common table names: "jobInfo", "compensation", "education", "customBonus", "emergencyContacts", "dependents".'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      employeeId: z.string().describe('The employee ID'),
      tableName: z
        .string()
        .describe('The table name (e.g., "jobInfo", "compensation", "education")')
    })
  )
  .output(
    z.object({
      employeeId: z.string().describe('The employee ID'),
      tableName: z.string().describe('The table name'),
      rows: z.array(z.record(z.string(), z.any())).describe('Table row data')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let data = await client.getTableRows(ctx.input.employeeId, ctx.input.tableName);
    let rows = data;

    return {
      output: {
        employeeId: ctx.input.employeeId,
        tableName: ctx.input.tableName,
        rows
      },
      message: `Retrieved **${rows.length}** rows from table **${ctx.input.tableName}** for employee **${ctx.input.employeeId}**.`
    };
  })
  .build();

export let upsertTableRow = SlateTool.create(spec, {
  name: 'Add or Update Table Row',
  key: 'upsert_table_row',
  description: `Add a new row or update an existing row in an employee's table data. If a rowId is provided, the existing row is updated; otherwise a new row is created. Tables include job history, compensation, education, and other structured data.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      employeeId: z.string().describe('The employee ID'),
      tableName: z
        .string()
        .describe('The table name (e.g., "jobInfo", "compensation", "education")'),
      rowId: z
        .string()
        .optional()
        .describe('If updating, the ID of the existing row to update'),
      rowData: z.record(z.string(), z.any()).describe('Row data as key-value pairs')
    })
  )
  .output(
    z.object({
      employeeId: z.string().describe('The employee ID'),
      tableName: z.string().describe('The table name'),
      action: z.string().describe('Whether creation or update was accepted'),
      rowId: z
        .string()
        .optional()
        .describe('Exact supplied ID for an update; creation returns no row ID'),
      verifiedFields: z
        .array(z.string())
        .optional()
        .describe('Submitted update fields whose exact values were read back'),
      unverifiedFields: z
        .array(z.string())
        .optional()
        .describe(
          'Submitted fields that remain unverified because they were omitted, normalized, or creation has no exact ID receipt'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let verifiedFields: string[] = [];
    if (ctx.input.rowId !== undefined) {
      verifiedFields = await client.updateTableRow(
        ctx.input.employeeId,
        ctx.input.tableName,
        ctx.input.rowId,
        ctx.input.rowData
      );
    } else {
      await client.addTableRow(ctx.input.employeeId, ctx.input.tableName, ctx.input.rowData);
    }

    let action = ctx.input.rowId !== undefined ? 'updated' : 'created';
    const unverifiedFields = Object.keys(ctx.input.rowData).filter(
      field => !verifiedFields.includes(field)
    );

    return {
      output: {
        employeeId: ctx.input.employeeId,
        tableName: ctx.input.tableName,
        action,
        ...(ctx.input.rowId !== undefined ? { rowId: ctx.input.rowId } : {}),
        verifiedFields,
        unverifiedFields
      },
      message:
        action === 'created'
          ? 'BambooHR accepted row creation without an ID receipt. Use get_table_data to identify the exact row and verify its values before further changes.'
          : `BambooHR accepted the row update. Verified exact values for **${verifiedFields.length}** submitted fields; **${unverifiedFields.length}** remain unverified.`
    };
  })
  .build();

export let deleteTableRow = SlateTool.create(spec, {
  name: 'Delete Table Row',
  key: 'delete_table_row',
  description: `Delete a specific row from an employee's table data. Requires the employee ID, table name, and row ID.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      employeeId: z.string().describe('The employee ID'),
      tableName: z.string().describe('The table name'),
      rowId: z.string().describe('The ID of the row to delete')
    })
  )
  .output(
    z.object({
      employeeId: z.string().describe('The employee ID'),
      tableName: z.string().describe('The table name'),
      rowId: z.string().describe('The deleted row ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    await client.deleteTableRow(ctx.input.employeeId, ctx.input.tableName, ctx.input.rowId);

    return {
      output: {
        employeeId: ctx.input.employeeId,
        tableName: ctx.input.tableName,
        rowId: ctx.input.rowId
      },
      message: `Deleted row **${ctx.input.rowId}** from table **${ctx.input.tableName}** for employee **${ctx.input.employeeId}**.`
    };
  })
  .build();
