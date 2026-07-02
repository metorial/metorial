import { SlateTool } from 'slates';
import { z } from 'zod';
import { XataWorkspaceClient } from '../lib/client';
import { spec } from '../spec';

export let getRecord = SlateTool.create(spec, {
  name: 'Get Record',
  key: 'get_record',
  description: `Retrieve a single record by its ID from a Xata table. Optionally select specific columns to return.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      branch: z.string().optional().describe('Branch name (defaults to config branch)'),
      tableName: z.string().describe('Name of the table'),
      recordId: z.string().describe('ID of the record to retrieve'),
      columns: z
        .array(z.string())
        .optional()
        .describe('Specific columns to return. Returns all columns if omitted.')
    })
  )
  .output(
    z.object({
      record: z.any().describe('The retrieved record data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XataWorkspaceClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId || '',
      region: ctx.config.region
    });

    let branch = ctx.input.branch || ctx.config.branch;
    let record = await client.getRecord(
      ctx.input.databaseName,
      branch,
      ctx.input.tableName,
      ctx.input.recordId,
      ctx.input.columns
    );

    return {
      output: { record },
      message: `Retrieved record **${ctx.input.recordId}** from **${ctx.input.tableName}**.`
    };
  })
  .build();

export let createRecord = SlateTool.create(spec, {
  name: 'Create Record',
  key: 'create_record',
  description: `Insert a new record into a Xata table. Optionally specify a custom ID; otherwise, one is auto-generated. Supports bulk inserts by providing an array of records.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      branch: z.string().optional().describe('Branch name (defaults to config branch)'),
      tableName: z.string().describe('Name of the table'),
      recordId: z.string().optional().describe('Optional custom ID for the record'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Field values for a single record'),
      records: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe(
          'Array of records for bulk insert. Provide either fields (single) or records (bulk), not both.'
        )
    })
  )
  .output(
    z.object({
      recordId: z.string().optional().describe('ID of the created record (single insert)'),
      recordIds: z
        .array(z.string())
        .optional()
        .describe('IDs of created records (bulk insert)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XataWorkspaceClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId || '',
      region: ctx.config.region
    });

    let branch = ctx.input.branch || ctx.config.branch;

    if (ctx.input.records && ctx.input.records.length > 0) {
      let result = await client.bulkInsertRecords(
        ctx.input.databaseName,
        branch,
        ctx.input.tableName,
        ctx.input.records
      );

      let recordIds = (result.recordIDs || []) as string[];
      return {
        output: { recordIds },
        message: `Bulk inserted **${recordIds.length}** record(s) into **${ctx.input.tableName}**.`
      };
    }

    let result = await client.insertRecord(
      ctx.input.databaseName,
      branch,
      ctx.input.tableName,
      ctx.input.fields || {},
      ctx.input.recordId
    );

    return {
      output: { recordId: result.id },
      message: `Created record **${result.id}** in **${ctx.input.tableName}**.`
    };
  })
  .build();

export let updateRecord = SlateTool.create(spec, {
  name: 'Update Record',
  key: 'update_record',
  description: `Update an existing record in a Xata table by its ID. Only the provided fields will be updated; other fields remain unchanged. Use upsert mode to create the record if it doesn't exist.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      branch: z.string().optional().describe('Branch name (defaults to config branch)'),
      tableName: z.string().describe('Name of the table'),
      recordId: z.string().describe('ID of the record to update'),
      fields: z.record(z.string(), z.any()).describe('Fields to update with new values'),
      upsert: z
        .boolean()
        .optional()
        .describe('If true, create the record if it does not exist')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('ID of the updated record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XataWorkspaceClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId || '',
      region: ctx.config.region
    });

    let branch = ctx.input.branch || ctx.config.branch;

    let result: any;
    if (ctx.input.upsert) {
      result = await client.upsertRecord(
        ctx.input.databaseName,
        branch,
        ctx.input.tableName,
        ctx.input.recordId,
        ctx.input.fields
      );
    } else {
      result = await client.updateRecord(
        ctx.input.databaseName,
        branch,
        ctx.input.tableName,
        ctx.input.recordId,
        ctx.input.fields
      );
    }

    return {
      output: { recordId: result.id || ctx.input.recordId },
      message: `${ctx.input.upsert ? 'Upserted' : 'Updated'} record **${ctx.input.recordId}** in **${ctx.input.tableName}**.`
    };
  })
  .build();

export let deleteRecord = SlateTool.create(spec, {
  name: 'Delete Record',
  key: 'delete_record',
  description: `Delete a record from a Xata table by its ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      branch: z.string().optional().describe('Branch name (defaults to config branch)'),
      tableName: z.string().describe('Name of the table'),
      recordId: z.string().describe('ID of the record to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the record was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XataWorkspaceClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId || '',
      region: ctx.config.region
    });

    let branch = ctx.input.branch || ctx.config.branch;

    await client.deleteRecord(
      ctx.input.databaseName,
      branch,
      ctx.input.tableName,
      ctx.input.recordId
    );

    return {
      output: { deleted: true },
      message: `Deleted record **${ctx.input.recordId}** from **${ctx.input.tableName}**.`
    };
  })
  .build();
