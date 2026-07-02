import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConvexClient } from '../lib/client';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `List documents from a Convex table using the Streaming Export API snapshot endpoint.
Retrieves a paginated snapshot of documents from a specific table or across all tables.
Useful for browsing data, exporting records, or inspecting table contents.
Requires deploy key authentication.`,
  instructions: [
    'Use the tableName parameter to filter documents from a specific table',
    'Use cursor and snapshotId for paginating through large result sets',
    'The snapshotId must remain consistent across pages of the same snapshot'
  ],
  constraints: [
    'Requires deploy key (admin) authentication',
    'Returns up to a page of results at a time; use cursor for pagination'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tableName: z
        .string()
        .optional()
        .describe(
          'Name of the table to list documents from. If omitted, lists from all tables.'
        ),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      snapshotId: z
        .string()
        .optional()
        .describe('Snapshot ID for consistent reads across pages')
    })
  )
  .output(
    z.object({
      documents: z.array(z.any()).describe('Array of documents from the snapshot'),
      cursor: z.string().describe('Cursor for fetching the next page'),
      snapshotId: z.string().describe('Snapshot ID for consistent pagination'),
      hasMore: z.boolean().describe('Whether more documents are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConvexClient({
      deploymentUrl: ctx.config.deploymentUrl,
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    ctx.progress('Fetching documents...');
    let result = await client.listSnapshot({
      tableName: ctx.input.tableName,
      cursor: ctx.input.cursor,
      snapshotId: ctx.input.snapshotId
    });

    let docCount = result.values?.length || 0;
    let tableInfo = ctx.input.tableName ? ` from table **${ctx.input.tableName}**` : '';

    return {
      output: {
        documents: result.values || [],
        cursor: result.cursor,
        snapshotId: result.snapshot,
        hasMore: result.hasMore
      },
      message: `Retrieved **${docCount}** documents${tableInfo}.${result.hasMore ? ' More documents available.' : ''}`
    };
  })
  .build();
