import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElasticsearchClient } from '../lib/client';
import { elasticsearchServiceError } from '../lib/errors';
import { spec } from '../spec';

export let managePipelineTool = SlateTool.create(spec, {
  name: 'Manage Ingest Pipeline',
  key: 'manage_pipeline',
  description: `Create, update, delete, list, or simulate ingest pipelines. Pipelines consist of processors that transform and enrich documents before they are indexed. Use simulate to test a pipeline against sample documents.`,
  instructions: [
    'To simulate a pipeline, provide sample documents in the "simulateDocuments" field',
    'When creating/updating, provide "processors" as an array of processor definitions'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'delete', 'get', 'list', 'simulate'])
        .describe('The pipeline action to perform'),
      pipelineId: z
        .string()
        .optional()
        .describe(
          'Pipeline ID (required for create, delete, get, and simulate with existing pipeline)'
        ),
      description: z.string().optional().describe('Pipeline description (for create action)'),
      processors: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of processor definitions (for create action)'),
      simulateDocuments: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Sample documents to simulate the pipeline against')
    })
  )
  .output(
    z.object({
      acknowledged: z.boolean().optional().describe('Whether the request was acknowledged'),
      pipelines: z
        .record(z.string(), z.any())
        .optional()
        .describe('Pipeline definitions (for get/list)'),
      simulationResults: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Results from pipeline simulation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElasticsearchClient({
      baseUrl: ctx.auth.baseUrl,
      authHeader: ctx.auth.authHeader
    });

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.pipelineId)
          throw elasticsearchServiceError('pipelineId is required for create action');
        if (!ctx.input.processors)
          throw elasticsearchServiceError('processors are required for create action');
        let body: Record<string, any> = { processors: ctx.input.processors };
        if (ctx.input.description) body.description = ctx.input.description;
        let result = await client.putPipeline(ctx.input.pipelineId, body);
        return {
          output: { acknowledged: result.acknowledged ?? true },
          message: `Pipeline **${ctx.input.pipelineId}** created/updated successfully.`
        };
      }
      case 'delete': {
        if (!ctx.input.pipelineId)
          throw elasticsearchServiceError('pipelineId is required for delete action');
        let result = await client.deletePipeline(ctx.input.pipelineId);
        return {
          output: { acknowledged: result.acknowledged ?? true },
          message: `Pipeline **${ctx.input.pipelineId}** deleted.`
        };
      }
      case 'get': {
        let result = await client.getPipeline(ctx.input.pipelineId);
        return {
          output: { pipelines: result },
          message: `Retrieved pipeline${ctx.input.pipelineId ? ` **${ctx.input.pipelineId}**` : 's'}.`
        };
      }
      case 'list': {
        let result = await client.getPipeline();
        let pipelineNames = Object.keys(result);
        return {
          output: { pipelines: result },
          message: `Found **${pipelineNames.length}** ingest pipelines.`
        };
      }
      case 'simulate': {
        if (!ctx.input.simulateDocuments)
          throw elasticsearchServiceError(
            'simulateDocuments are required for simulate action'
          );
        let body = { docs: ctx.input.simulateDocuments.map(doc => ({ _source: doc })) };
        let result = await client.simulatePipeline(body, ctx.input.pipelineId);
        return {
          output: { simulationResults: result.docs },
          message: `Simulated pipeline against **${ctx.input.simulateDocuments.length}** documents.`
        };
      }
    }
  })
  .build();
