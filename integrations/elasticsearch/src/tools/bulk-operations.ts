import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElasticsearchClient } from '../lib/client';
import { elasticsearchServiceError } from '../lib/errors';
import { spec } from '../spec';

export let bulkOperationsTool = SlateTool.create(spec, {
  name: 'Bulk Operations',
  key: 'bulk_operations',
  description: `Perform multiple index, create, update, or delete operations in a single API call. Much more efficient than individual requests when processing many documents.`,
  instructions: [
    'Each operation is an object with an "action" (index, create, update, delete), an "indexName", a "documentId" (optional for index/create), and a "document" body.',
    'For update actions, provide the partial document in the "document" field.'
  ],
  constraints: [
    'Large bulk operations may time out. Consider splitting into smaller batches for very large datasets.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      operations: z
        .array(
          z.object({
            action: z
              .enum(['index', 'create', 'update', 'delete'])
              .describe('The bulk action type'),
            indexName: z.string().describe('Target index for this operation'),
            documentId: z
              .string()
              .optional()
              .describe('Document ID (required for update and delete)'),
            document: z
              .record(z.string(), z.any())
              .optional()
              .describe('Document body (required for index, create, update)')
          })
        )
        .describe('Array of operations to perform')
    })
  )
  .output(
    z.object({
      took: z.number().describe('Time in milliseconds'),
      errors: z.boolean().describe('Whether any operations had errors'),
      itemCount: z.number().describe('Total number of operations processed'),
      successCount: z.number().describe('Number of successful operations'),
      errorCount: z.number().describe('Number of failed operations'),
      errorItems: z
        .array(
          z.object({
            indexName: z.string().optional().describe('Index name'),
            documentId: z.string().optional().describe('Document ID'),
            error: z.string().describe('Error message')
          })
        )
        .optional()
        .describe('Details of failed operations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElasticsearchClient({
      baseUrl: ctx.auth.baseUrl,
      authHeader: ctx.auth.authHeader
    });

    let ndjsonLines: string[] = [];
    for (let op of ctx.input.operations) {
      if ((op.action === 'update' || op.action === 'delete') && !op.documentId) {
        throw elasticsearchServiceError(`documentId is required for ${op.action} operations`);
      }
      if (op.action !== 'delete' && !op.document) {
        throw elasticsearchServiceError(`document is required for ${op.action} operations`);
      }

      let meta: Record<string, any> = { _index: op.indexName };
      if (op.documentId) meta._id = op.documentId;

      if (op.action === 'delete') {
        ndjsonLines.push(JSON.stringify({ delete: meta }));
      } else if (op.action === 'update') {
        ndjsonLines.push(JSON.stringify({ update: meta }));
        ndjsonLines.push(JSON.stringify({ doc: op.document }));
      } else {
        ndjsonLines.push(JSON.stringify({ [op.action]: meta }));
        ndjsonLines.push(JSON.stringify(op.document || {}));
      }
    }

    let ndjson = `${ndjsonLines.join('\n')}\n`;
    let result = await client.bulkOperations(ndjson);

    let errorItems: Array<{ indexName?: string; documentId?: string; error: string }> = [];
    let successCount = 0;

    for (let item of result.items || []) {
      let action = Object.keys(item)[0]!;
      let detail = item[action];
      if (detail.error) {
        errorItems.push({
          indexName: detail._index,
          documentId: detail._id,
          error:
            typeof detail.error === 'string'
              ? detail.error
              : detail.error.reason || JSON.stringify(detail.error)
        });
      } else {
        successCount++;
      }
    }

    return {
      output: {
        took: result.took,
        errors: result.errors,
        itemCount: (result.items || []).length,
        successCount,
        errorCount: errorItems.length,
        errorItems: errorItems.length > 0 ? errorItems : undefined
      },
      message: `Bulk operation completed in ${result.took}ms — **${successCount}** succeeded, **${errorItems.length}** failed.`
    };
  })
  .build();
