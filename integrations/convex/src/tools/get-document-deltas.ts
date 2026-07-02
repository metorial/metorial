import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConvexClient } from '../lib/client';
import { spec } from '../spec';

export let getDocumentDeltas = SlateTool.create(spec, {
  name: 'Get Document Changes',
  key: 'get_document_deltas',
  description: `Retrieve incremental document changes (inserts, updates, deletes) from a Convex deployment using the Streaming Export API.
Returns a cursor-based change feed of document-level modifications since a given cursor position.
Useful for syncing external systems, building audit trails, or tracking data changes over time.
Requires deploy key authentication.`,
  instructions: [
    'Provide a cursor from a previous response to get only new changes',
    'On first call without a cursor, returns the initial set of changes',
    'Use tableName to filter changes for a specific table'
  ],
  constraints: ['Requires deploy key (admin) authentication'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z
        .string()
        .optional()
        .describe('Cursor from a previous response to resume fetching changes'),
      tableName: z.string().optional().describe('Filter changes to a specific table')
    })
  )
  .output(
    z.object({
      changes: z
        .array(z.any())
        .describe('Array of document changes (inserts, updates, deletes)'),
      cursor: z.string().describe('Cursor to use for fetching subsequent changes'),
      hasMore: z.boolean().describe('Whether more changes are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConvexClient({
      deploymentUrl: ctx.config.deploymentUrl,
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    ctx.progress('Fetching document changes...');
    let result = await client.documentDeltas({
      cursor: ctx.input.cursor,
      tableName: ctx.input.tableName
    });

    let changeCount = result.values?.length || 0;
    let tableInfo = ctx.input.tableName ? ` in table **${ctx.input.tableName}**` : '';

    return {
      output: {
        changes: result.values || [],
        cursor: result.cursor,
        hasMore: result.hasMore
      },
      message: `Retrieved **${changeCount}** document changes${tableInfo}.${result.hasMore ? ' More changes available.' : ''}`
    };
  })
  .build();
