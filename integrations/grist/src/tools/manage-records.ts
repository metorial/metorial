import { SlateTool } from 'slates';
import { z } from 'zod';
import { GristClient } from '../lib/client';
import { spec } from '../spec';

let recordSchema = z.object({
  recordId: z.number().describe('Row/record ID'),
  fields: z.record(z.string(), z.any()).describe('Record field values keyed by column ID')
});

export let fetchRecords = SlateTool.create(spec, {
  name: 'Fetch Records',
  key: 'fetch_records',
  description: `Fetch records (rows) from a table with optional filtering, sorting, and limiting. Supports filtering by column values and sorting in ascending/descending order.`,
  instructions: [
    'Filter format: an object where keys are column IDs and values are arrays of allowed values, e.g. {"Status": ["Active"], "Priority": [1, 2]}.',
    'Sort format: comma-separated column IDs, prefix with "-" for descending, e.g. "Name,-CreatedAt".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID'),
      tableId: z.string().describe('Table ID'),
      filter: z
        .record(z.string(), z.array(z.any()))
        .optional()
        .describe(
          'Filter by column values: keys are column IDs, values are arrays of allowed values'
        ),
      sort: z
        .string()
        .optional()
        .describe(
          'Sort specification: comma-separated column IDs, prefix with "-" for descending'
        ),
      limit: z.number().optional().describe('Maximum number of records to return'),
      includeHidden: z.boolean().optional().describe('Include hidden columns in the response')
    })
  )
  .output(
    z.object({
      records: z.array(recordSchema).describe('Fetched records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GristClient({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let result = await client.listRecords(ctx.input.documentId, ctx.input.tableId, {
      filter: ctx.input.filter,
      sort: ctx.input.sort,
      limit: ctx.input.limit,
      hidden: ctx.input.includeHidden
    });

    let records = (result.records || []).map((r: any) => ({
      recordId: r.id,
      fields: r.fields
    }));

    return {
      output: { records },
      message: `Fetched **${records.length}** record(s) from table **${ctx.input.tableId}**.`
    };
  })
  .build();

export let addRecords = SlateTool.create(spec, {
  name: 'Add Records',
  key: 'add_records',
  description: `Add one or more records (rows) to a table. Each record is an object of column ID to value mappings.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID'),
      tableId: z.string().describe('Table ID'),
      records: z
        .array(
          z.object({
            fields: z.record(z.string(), z.any()).describe('Field values keyed by column ID')
          })
        )
        .describe('Records to add'),
      noparse: z
        .boolean()
        .optional()
        .describe('If true, skip Grist type parsing and accept raw values')
    })
  )
  .output(
    z.object({
      recordIds: z.array(z.number()).describe('IDs of the newly created records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GristClient({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let result = await client.addRecords(
      ctx.input.documentId,
      ctx.input.tableId,
      ctx.input.records,
      ctx.input.noparse
    );
    let recordIds = result.records?.map((r: any) => r.id) || [];

    return {
      output: { recordIds },
      message: `Added **${recordIds.length}** record(s) to table **${ctx.input.tableId}**.`
    };
  })
  .build();

export let updateRecords = SlateTool.create(spec, {
  name: 'Update Records',
  key: 'update_records',
  description: `Update existing records in a table by their record IDs. Only specified fields will be modified.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID'),
      tableId: z.string().describe('Table ID'),
      records: z
        .array(
          z.object({
            recordId: z.number().describe('Record ID to update'),
            fields: z
              .record(z.string(), z.any())
              .describe('Field values to update, keyed by column ID')
          })
        )
        .describe('Records to update'),
      noparse: z
        .boolean()
        .optional()
        .describe('If true, skip Grist type parsing and accept raw values')
    })
  )
  .output(
    z.object({
      updatedCount: z.number().describe('Number of records updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GristClient({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    await client.updateRecords(
      ctx.input.documentId,
      ctx.input.tableId,
      ctx.input.records.map(r => ({ id: r.recordId, fields: r.fields })),
      ctx.input.noparse
    );

    return {
      output: { updatedCount: ctx.input.records.length },
      message: `Updated **${ctx.input.records.length}** record(s) in table **${ctx.input.tableId}**.`
    };
  })
  .build();

export let addOrUpdateRecords = SlateTool.create(spec, {
  name: 'Add or Update Records',
  key: 'add_or_update_records',
  description: `Upsert records: for each record, check if a matching record exists using the "require" fields. If found, update it with the "fields" values. If not found, create a new record combining "require" and "fields".`,
  instructions: [
    'The "require" object specifies columns and values used to find an existing record.',
    'The "fields" object specifies columns and values to set on the found or newly created record.',
    'Use "onmany" to control behavior when multiple records match: "first" (default), "none" (skip), or "all" (update all).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID'),
      tableId: z.string().describe('Table ID'),
      records: z
        .array(
          z.object({
            require: z
              .record(z.string(), z.any())
              .describe('Column values to match against existing records'),
            fields: z
              .record(z.string(), z.any())
              .optional()
              .describe('Column values to set on matched or new records')
          })
        )
        .describe('Records to upsert'),
      onmany: z
        .enum(['first', 'none', 'all'])
        .optional()
        .describe(
          'When multiple records match: "first" updates the first, "none" skips, "all" updates all'
        ),
      noadd: z
        .boolean()
        .optional()
        .describe('If true, do not add new records when no match is found'),
      noupdate: z.boolean().optional().describe('If true, do not update existing records'),
      noparse: z.boolean().optional().describe('If true, skip Grist type parsing'),
      allowEmptyRequire: z
        .boolean()
        .optional()
        .describe('If true, allow empty require objects (matches all records)')
    })
  )
  .output(
    z.object({
      processed: z.boolean().describe('Whether the operation completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GristClient({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    await client.addOrUpdateRecords(
      ctx.input.documentId,
      ctx.input.tableId,
      ctx.input.records,
      {
        noparse: ctx.input.noparse,
        onmany: ctx.input.onmany,
        noadd: ctx.input.noadd,
        noupdate: ctx.input.noupdate,
        allowEmptyRequire: ctx.input.allowEmptyRequire
      }
    );

    return {
      output: { processed: true },
      message: `Processed **${ctx.input.records.length}** upsert record(s) in table **${ctx.input.tableId}**.`
    };
  })
  .build();

export let deleteRecords = SlateTool.create(spec, {
  name: 'Delete Records',
  key: 'delete_records',
  description: `Delete records from a table by their record IDs.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID'),
      tableId: z.string().describe('Table ID'),
      recordIds: z.array(z.number()).describe('Record IDs to delete')
    })
  )
  .output(
    z.object({
      deletedCount: z.number().describe('Number of records deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GristClient({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    await client.deleteRecords(ctx.input.documentId, ctx.input.tableId, ctx.input.recordIds);

    return {
      output: { deletedCount: ctx.input.recordIds.length },
      message: `Deleted **${ctx.input.recordIds.length}** record(s) from table **${ctx.input.tableId}**.`
    };
  })
  .build();
