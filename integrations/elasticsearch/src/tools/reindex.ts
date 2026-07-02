import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElasticsearchClient } from '../lib/client';
import { spec } from '../spec';

export let reindexTool = SlateTool.create(spec, {
  name: 'Reindex',
  key: 'reindex',
  description: `Copy documents from one index to another, optionally applying a query filter or transformations via a script. Useful for migrating data between indices, changing mappings, or applying pipeline processing to existing data.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceIndex: z.string().describe('Source index to copy documents from'),
      destinationIndex: z.string().describe('Destination index to copy documents to'),
      query: z
        .record(z.string(), z.any())
        .optional()
        .describe('Optional query to filter which documents to reindex'),
      script: z
        .object({
          source: z.string().describe('Script source code'),
          lang: z.string().optional().describe('Script language (default: painless)')
        })
        .optional()
        .describe('Optional script to transform documents during reindexing'),
      pipeline: z
        .string()
        .optional()
        .describe('Optional ingest pipeline to apply during reindexing'),
      maxDocs: z.number().optional().describe('Maximum number of documents to reindex'),
      waitForCompletion: z
        .boolean()
        .optional()
        .describe('Whether to wait for completion (default: false)')
    })
  )
  .output(
    z.object({
      taskId: z.string().optional().describe('Task ID for async reindex operations'),
      took: z.number().optional().describe('Time in milliseconds the reindex took'),
      totalDocuments: z.number().optional().describe('Total documents processed'),
      createdDocuments: z.number().optional().describe('Documents created in destination'),
      updatedDocuments: z.number().optional().describe('Documents updated in destination'),
      failures: z.array(z.any()).optional().describe('Any failures during reindexing')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElasticsearchClient({
      baseUrl: ctx.auth.baseUrl,
      authHeader: ctx.auth.authHeader
    });

    let body: Record<string, any> = {
      source: { index: ctx.input.sourceIndex },
      dest: { index: ctx.input.destinationIndex }
    };

    if (ctx.input.query) body.source.query = ctx.input.query;
    if (ctx.input.script) body.script = ctx.input.script;
    if (ctx.input.pipeline) body.dest.pipeline = ctx.input.pipeline;
    if (ctx.input.maxDocs) body.max_docs = ctx.input.maxDocs;

    let params: Record<string, any> = {};
    if (ctx.input.waitForCompletion !== undefined) {
      params.wait_for_completion = ctx.input.waitForCompletion;
    } else {
      params.wait_for_completion = false;
    }

    let result = await client.reindex(body, params);

    if (result.task) {
      return {
        output: {
          taskId: result.task
        },
        message: `Reindex from **${ctx.input.sourceIndex}** to **${ctx.input.destinationIndex}** started (task: ${result.task}).`
      };
    }

    return {
      output: {
        took: result.took,
        totalDocuments: result.total,
        createdDocuments: result.created,
        updatedDocuments: result.updated,
        failures: result.failures
      },
      message: `Reindexed **${result.total}** documents from **${ctx.input.sourceIndex}** to **${ctx.input.destinationIndex}** in ${result.took}ms.`
    };
  })
  .build();
