import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { requireProjectRef } from '../lib/errors';
import { ProjectClient } from '../lib/project-client';
import { spec } from '../spec';

export let manageTableRows = SlateTool.create(spec, {
  name: 'Manage Table Rows',
  key: 'manage_table_rows',
  description: `Insert, update, upsert, or delete rows in a Supabase table using the auto-generated REST API. Supports bulk operations and conflict resolution for upserts.`,
  instructions: [
    'For **insert**: provide rows as an array of objects.',
    'For **update**: provide updates (column values to set) and filters to match rows.',
    'For **upsert**: provide rows and optionally onConflict to specify the conflict column.',
    'For **delete**: provide filters to match rows to delete. Filters are required to prevent accidental full-table deletes.',
    'Filters use PostgREST syntax: {"column": "operator.value"}, e.g. {"id": "eq.123"}.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectRef: z
        .string()
        .optional()
        .describe('Project reference ID (uses config.projectRef if not provided)'),
      table: z.string().describe('Table name'),
      action: z
        .enum(['insert', 'update', 'upsert', 'delete'])
        .describe('Operation to perform'),
      rows: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Rows to insert or upsert'),
      updates: z
        .record(z.string(), z.any())
        .optional()
        .describe('Column values to update (for update action)'),
      filters: z
        .record(z.string(), z.string())
        .optional()
        .describe('PostgREST filters to match rows (for update and delete)'),
      onConflict: z.string().optional().describe('Conflict resolution column(s) for upsert'),
      schema: z.string().optional().describe('Database schema (defaults to public)')
    })
  )
  .output(
    z.object({
      rows: z
        .array(z.record(z.string(), z.any()))
        .describe('Affected rows (returned from the operation)'),
      rowCount: z.number().describe('Number of rows affected')
    })
  )
  .handleInvocation(async ctx => {
    let projectRef = requireProjectRef(ctx.input.projectRef ?? ctx.config.projectRef);

    let mgmt = new ManagementClient(ctx.auth.token);
    let keys = await mgmt.getProjectApiKeys(projectRef);
    let serviceKey = (Array.isArray(keys) ? keys : []).find(
      (k: any) => k.name === 'service_role'
    );
    let apiKey = serviceKey?.api_key;

    if (!apiKey) {
      throw createApiServiceError(
        'Could not retrieve service_role API key for the project. service_role key is required for data modifications.'
      );
    }

    let projectClient = new ProjectClient(projectRef, apiKey);
    let { action, table } = ctx.input;
    let result: any;

    if (action === 'insert') {
      if (!ctx.input.rows || ctx.input.rows.length === 0) {
        throw createApiServiceError('rows are required for insert action');
      }
      result = await projectClient.insertRows(table, ctx.input.rows, {
        schema: ctx.input.schema
      });
    } else if (action === 'update') {
      if (!ctx.input.updates) {
        throw createApiServiceError('updates are required for update action');
      }
      if (!ctx.input.filters || Object.keys(ctx.input.filters).length === 0) {
        throw createApiServiceError(
          'filters are required for update action to prevent accidental full-table updates'
        );
      }
      result = await projectClient.updateRows(table, ctx.input.updates, ctx.input.filters, {
        schema: ctx.input.schema
      });
    } else if (action === 'upsert') {
      if (!ctx.input.rows || ctx.input.rows.length === 0) {
        throw createApiServiceError('rows are required for upsert action');
      }
      result = await projectClient.upsertRows(table, ctx.input.rows, {
        onConflict: ctx.input.onConflict,
        schema: ctx.input.schema
      });
    } else {
      // delete
      if (!ctx.input.filters || Object.keys(ctx.input.filters).length === 0) {
        throw createApiServiceError(
          'filters are required for delete action to prevent accidental full-table deletes'
        );
      }
      result = await projectClient.deleteRows(table, ctx.input.filters, {
        schema: ctx.input.schema
      });
    }

    let rows = Array.isArray(result) ? result : [];

    return {
      output: { rows, rowCount: rows.length },
      message: `Performed **${action}** on **${table}** — **${rows.length}** rows affected.`
    };
  })
  .build();
