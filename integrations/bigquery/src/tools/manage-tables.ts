import { SlateTool } from 'slates';
import { z } from 'zod';
import { BigQueryClient } from '../lib/client';
import { spec } from '../spec';

let fieldSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    name: z.string().describe('Column name'),
    type: z
      .string()
      .describe('Column type (STRING, INTEGER, FLOAT, BOOLEAN, TIMESTAMP, RECORD, etc.)'),
    mode: z.enum(['NULLABLE', 'REQUIRED', 'REPEATED']).optional().describe('Column mode'),
    description: z.string().optional().describe('Column description'),
    fields: z.array(fieldSchema).optional().describe('Nested fields for RECORD type')
  })
);

export let listTables = SlateTool.create(spec, {
  name: 'List Tables',
  key: 'list_tables',
  description: `List all tables, views, and materialized views in a BigQuery dataset. Returns table IDs, types, creation times, and expiration info.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('Dataset to list tables from'),
      maxResults: z.number().optional().describe('Maximum number of tables to return'),
      pageToken: z.string().optional().describe('Page token for paginated results')
    })
  )
  .output(
    z.object({
      tables: z.array(
        z.object({
          tableId: z.string(),
          datasetId: z.string(),
          projectId: z.string(),
          type: z.string().optional(),
          friendlyName: z.string().optional(),
          creationTime: z.string().optional(),
          expirationTime: z.string().optional(),
          labels: z.record(z.string(), z.string()).optional()
        })
      ),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    let result = await client.listTables(ctx.input.datasetId, {
      maxResults: ctx.input.maxResults,
      pageToken: ctx.input.pageToken
    });

    let tables = (result.tables || []).map((t: any) => ({
      tableId: t.tableReference.tableId,
      datasetId: t.tableReference.datasetId,
      projectId: t.tableReference.projectId,
      type: t.type,
      friendlyName: t.friendlyName,
      creationTime: t.creationTime,
      expirationTime: t.expirationTime,
      labels: t.labels
    }));

    return {
      output: {
        tables,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${tables.length}** table(s) in dataset **${ctx.input.datasetId}**.`
    };
  })
  .build();

export let getTable = SlateTool.create(spec, {
  name: 'Get Table',
  key: 'get_table',
  description: `Retrieve detailed metadata for a BigQuery table, including its schema, row count, size, partitioning configuration, and clustering settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('Dataset containing the table'),
      tableId: z.string().describe('Table ID to retrieve')
    })
  )
  .output(
    z.object({
      tableId: z.string(),
      datasetId: z.string(),
      projectId: z.string(),
      type: z.string().optional(),
      friendlyName: z.string().optional(),
      description: z.string().optional(),
      schema: z.any().optional(),
      numRows: z.string().optional(),
      numBytes: z.string().optional(),
      creationTime: z.string(),
      lastModifiedTime: z.string(),
      expirationTime: z.string().optional(),
      timePartitioning: z.any().optional(),
      rangePartitioning: z.any().optional(),
      clustering: z.any().optional(),
      labels: z.record(z.string(), z.string()).optional(),
      view: z.any().optional(),
      materializedView: z.any().optional(),
      externalDataConfiguration: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    let table = await client.getTable(ctx.input.datasetId, ctx.input.tableId);

    return {
      output: {
        tableId: table.tableReference.tableId,
        datasetId: table.tableReference.datasetId,
        projectId: table.tableReference.projectId,
        type: table.type,
        friendlyName: table.friendlyName,
        description: table.description,
        schema: table.schema,
        numRows: table.numRows,
        numBytes: table.numBytes,
        creationTime: table.creationTime,
        lastModifiedTime: table.lastModifiedTime,
        expirationTime: table.expirationTime,
        timePartitioning: table.timePartitioning,
        rangePartitioning: table.rangePartitioning,
        clustering: table.clustering,
        labels: table.labels,
        view: table.view,
        materializedView: table.materializedView,
        externalDataConfiguration: table.externalDataConfiguration
      },
      message: `Table **${ctx.input.tableId}** (${table.type || 'TABLE'}): **${table.numRows || 0}** rows, **${table.numBytes || 0}** bytes.`
    };
  })
  .build();

export let createTable = SlateTool.create(spec, {
  name: 'Create Table',
  key: 'create_table',
  description: `Create a new BigQuery table, view, or materialized view. Supports defining schemas with nested/repeated fields, time or range partitioning, and clustering. To create a view, provide the **viewQuery** parameter; for a materialized view, provide **materializedViewQuery**.`,
  instructions: [
    'For standard tables, provide a schema with at least one field.',
    'For views, provide viewQuery instead of a schema.',
    'Partitioning and clustering improve query performance for large tables.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('Dataset to create the table in'),
      tableId: z.string().describe('Unique ID for the new table'),
      friendlyName: z.string().optional().describe('Human-readable name'),
      description: z.string().optional().describe('Description of the table'),
      fields: z
        .array(fieldSchema)
        .optional()
        .describe('Table schema fields (for standard tables)'),
      expirationTime: z
        .string()
        .optional()
        .describe('Table expiration time as epoch milliseconds string'),
      timePartitioning: z
        .object({
          type: z.enum(['DAY', 'HOUR', 'MONTH', 'YEAR']).describe('Partitioning granularity'),
          field: z
            .string()
            .optional()
            .describe('Column to partition on (defaults to _PARTITIONTIME)'),
          expirationMs: z.string().optional().describe('Partition expiration in milliseconds')
        })
        .optional()
        .describe('Time-based partitioning configuration'),
      rangePartitioning: z
        .object({
          field: z.string().describe('Column to partition on'),
          range: z.object({
            start: z.string().describe('Start of range'),
            end: z.string().describe('End of range'),
            interval: z.string().describe('Width of each range partition')
          })
        })
        .optional()
        .describe('Integer range partitioning configuration'),
      clusteringFields: z
        .array(z.string())
        .optional()
        .describe('Up to 4 columns for clustering'),
      labels: z.record(z.string(), z.string()).optional().describe('Key-value labels'),
      viewQuery: z.string().optional().describe('SQL query for creating a view'),
      materializedViewQuery: z
        .string()
        .optional()
        .describe('SQL query for creating a materialized view'),
      materializedViewEnableRefresh: z
        .boolean()
        .optional()
        .describe('Enable automatic refresh for materialized views'),
      materializedViewRefreshIntervalMs: z
        .string()
        .optional()
        .describe('Refresh interval in milliseconds for materialized views')
    })
  )
  .output(
    z.object({
      tableId: z.string(),
      datasetId: z.string(),
      projectId: z.string(),
      type: z.string().optional(),
      creationTime: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    let tableConfig: any = {
      tableId: ctx.input.tableId,
      friendlyName: ctx.input.friendlyName,
      description: ctx.input.description,
      expirationTime: ctx.input.expirationTime,
      timePartitioning: ctx.input.timePartitioning,
      rangePartitioning: ctx.input.rangePartitioning,
      labels: ctx.input.labels
    };

    if (ctx.input.fields) {
      tableConfig.schema = { fields: ctx.input.fields };
    }

    if (ctx.input.clusteringFields) {
      tableConfig.clustering = { fields: ctx.input.clusteringFields };
    }

    if (ctx.input.viewQuery) {
      tableConfig.view = { query: ctx.input.viewQuery, useLegacySql: false };
    }

    if (ctx.input.materializedViewQuery) {
      tableConfig.materializedView = {
        query: ctx.input.materializedViewQuery,
        enableRefresh: ctx.input.materializedViewEnableRefresh,
        refreshIntervalMs: ctx.input.materializedViewRefreshIntervalMs
      };
    }

    let table = await client.createTable(ctx.input.datasetId, tableConfig);

    return {
      output: {
        tableId: table.tableReference.tableId,
        datasetId: table.tableReference.datasetId,
        projectId: table.tableReference.projectId,
        type: table.type,
        creationTime: table.creationTime
      },
      message: `Table **${ctx.input.tableId}** created in dataset **${ctx.input.datasetId}**.`
    };
  })
  .build();

export let updateTable = SlateTool.create(spec, {
  name: 'Update Table',
  key: 'update_table',
  description: `Update a BigQuery table's metadata including friendly name, description, schema (add new columns), expiration, and labels.`,
  instructions: [
    'You can add new columns to the schema but cannot remove or rename existing columns.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('Dataset containing the table'),
      tableId: z.string().describe('Table ID to update'),
      friendlyName: z.string().optional().describe('Updated human-readable name'),
      description: z.string().optional().describe('Updated description'),
      fields: z
        .array(fieldSchema)
        .optional()
        .describe('Updated schema fields (can add new columns)'),
      expirationTime: z
        .string()
        .optional()
        .describe('Updated expiration time as epoch milliseconds string'),
      labels: z.record(z.string(), z.string()).optional().describe('Updated key-value labels')
    })
  )
  .output(
    z.object({
      tableId: z.string(),
      datasetId: z.string(),
      projectId: z.string(),
      lastModifiedTime: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    let updates: any = {};
    if (ctx.input.friendlyName !== undefined) updates.friendlyName = ctx.input.friendlyName;
    if (ctx.input.description !== undefined) updates.description = ctx.input.description;
    if (ctx.input.fields) updates.schema = { fields: ctx.input.fields };
    if (ctx.input.expirationTime !== undefined)
      updates.expirationTime = ctx.input.expirationTime;
    if (ctx.input.labels !== undefined) updates.labels = ctx.input.labels;

    let table = await client.updateTable(ctx.input.datasetId, ctx.input.tableId, updates);

    return {
      output: {
        tableId: table.tableReference.tableId,
        datasetId: table.tableReference.datasetId,
        projectId: table.tableReference.projectId,
        lastModifiedTime: table.lastModifiedTime
      },
      message: `Table **${ctx.input.tableId}** updated.`
    };
  })
  .build();

export let deleteTable = SlateTool.create(spec, {
  name: 'Delete Table',
  key: 'delete_table',
  description: `Permanently delete a BigQuery table or view. This action is irreversible.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('Dataset containing the table'),
      tableId: z.string().describe('Table ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    await client.deleteTable(ctx.input.datasetId, ctx.input.tableId);

    return {
      output: { deleted: true },
      message: `Table **${ctx.input.tableId}** deleted from dataset **${ctx.input.datasetId}**.`
    };
  })
  .build();
