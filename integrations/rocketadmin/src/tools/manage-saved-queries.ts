import { SlateTool } from 'slates';
import { z } from 'zod';
import { RocketadminClient } from '../lib/client';
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
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'execute'])
        .describe('Action to perform'),
      connectionId: z
        .string()
        .optional()
        .describe('Connection ID (required for list and create)'),
      queryId: z
        .string()
        .optional()
        .describe('Query ID (required for get, update, delete, execute)'),
      title: z.string().optional().describe('Query title'),
      queryText: z.string().optional().describe('SQL query text')
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
    let client = new RocketadminClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { action, connectionId, queryId, title, queryText } = ctx.input;

    if (action === 'list') {
      if (!connectionId) throw new Error('connectionId is required for listing queries');
      let queries = await client.listSavedQueries(connectionId);
      return {
        output: { queries, success: true },
        message: `Found **${queries.length}** saved query(ies).`
      };
    }

    if (action === 'get') {
      if (!queryId) throw new Error('queryId is required');
      let query = await client.getSavedQuery(queryId);
      return {
        output: { query, success: true },
        message: `Retrieved saved query **${queryId}**.`
      };
    }

    if (action === 'create') {
      if (!connectionId) throw new Error('connectionId is required for creating a query');
      let query = await client.createSavedQuery(connectionId, {
        ...(title ? { title } : {}),
        ...(queryText ? { query: queryText } : {})
      });
      return {
        output: { query, success: true },
        message: `Saved query created successfully.`
      };
    }

    if (action === 'update') {
      if (!queryId) throw new Error('queryId is required for updating');
      let query = await client.updateSavedQuery(queryId, {
        ...(title ? { title } : {}),
        ...(queryText ? { query: queryText } : {})
      });
      return {
        output: { query, success: true },
        message: `Saved query **${queryId}** updated.`
      };
    }

    if (action === 'delete') {
      if (!queryId) throw new Error('queryId is required for deleting');
      await client.deleteSavedQuery(queryId);
      return {
        output: { success: true },
        message: `Saved query **${queryId}** deleted.`
      };
    }

    if (action === 'execute') {
      if (!queryId) throw new Error('queryId is required for executing');
      let queryResult = await client.executeSavedQuery(queryId);
      return {
        output: { queryResult, success: true },
        message: `Query **${queryId}** executed successfully.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
