import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createRocketadminClient } from '../lib/client';
import { spec } from '../spec';

export let manageSavedQueries = SlateTool.create(spec, {
  name: 'Manage Saved Queries',
  key: 'manage_saved_queries',
  description: `Create, list, execute, update, or delete saved database queries. Saved queries let you store and reuse frequently needed SQL statements.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      masterPassword: z
        .string()
        .optional()
        .describe('Master password for an encrypted connection'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'execute'])
        .describe('Action to perform'),
      connectionId: z
        .string()
        .optional()
        .describe('Connection ID for every action. Call list_connections to discover IDs.'),
      queryId: z
        .string()
        .optional()
        .describe('Query ID (required for get, update, delete, execute)'),
      title: z.string().optional().describe('Query title'),
      queryText: z.string().optional().describe('SQL query text'),
      widgetType: z
        .enum(['table', 'chart', 'counter', 'text'])
        .optional()
        .describe('Visualization type; required when creating a saved query'),
      description: z.string().optional().describe('Saved query description'),
      chartType: z.string().optional().describe('Chart type when using a chart visualization'),
      widgetOptions: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Visualization options')
    })
  )
  .output(
    z.object({
      queries: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of saved queries'),
      query: z.record(z.string(), z.unknown()).optional().describe('Saved query details'),
      queryResult: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Result of executing the query'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = createRocketadminClient(ctx.auth, ctx.config, ctx.input.masterPassword);

    let {
      action,
      connectionId,
      queryId,
      title,
      queryText,
      widgetType,
      description,
      chartType,
      widgetOptions
    } = ctx.input;
    if (!connectionId)
      throw createApiServiceError(
        'connectionId is required for saved-query actions. Call list_connections to discover IDs.'
      );
    let payload = {
      ...(title !== undefined ? { name: title } : {}),
      ...(queryText !== undefined ? { query_text: queryText } : {}),
      ...(widgetType !== undefined ? { widget_type: widgetType } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(chartType !== undefined ? { chart_type: chartType } : {}),
      ...(widgetOptions !== undefined ? { widget_options: widgetOptions } : {})
    };

    if (action === 'list') {
      if (!connectionId)
        throw createApiServiceError('connectionId is required for listing queries');
      let queries = await client.listSavedQueries(connectionId);
      return {
        output: { queries, success: true },
        message: `Found **${queries.length}** saved query(ies).`
      };
    }

    if (action === 'get') {
      if (!queryId) throw createApiServiceError('queryId is required');
      let query = await client.getSavedQuery(connectionId, queryId);
      return {
        output: { query, success: true },
        message: `Retrieved saved query **${queryId}**.`
      };
    }

    if (action === 'create') {
      if (!connectionId)
        throw createApiServiceError('connectionId is required for creating a query');
      if (!title || !queryText || !widgetType)
        throw createApiServiceError(
          'title, queryText, and widgetType are required for creating a saved query.'
        );
      let query = await client.createSavedQuery(connectionId, payload);
      return {
        output: { query, success: true },
        message: `Saved query created successfully.`
      };
    }

    if (action === 'update') {
      if (!queryId) throw createApiServiceError('queryId is required for updating');
      let query = await client.updateSavedQuery(connectionId, queryId, payload);
      return {
        output: { query, success: true },
        message: `Saved query **${queryId}** updated.`
      };
    }

    if (action === 'delete') {
      if (!queryId) throw createApiServiceError('queryId is required for deleting');
      await client.deleteSavedQuery(connectionId, queryId);
      return {
        output: { success: true },
        message: `Saved query **${queryId}** deleted.`
      };
    }

    if (action === 'execute') {
      if (!queryId) throw createApiServiceError('queryId is required for executing');
      let queryResult = await client.executeSavedQuery(connectionId, queryId);
      return {
        output: { queryResult, success: true },
        message: `Query **${queryId}** executed successfully.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
