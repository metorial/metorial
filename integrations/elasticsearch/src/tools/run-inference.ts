import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElasticsearchClient } from '../lib/client';
import { elasticsearchServiceError } from '../lib/errors';
import { spec } from '../spec';

export let runInferenceTool = SlateTool.create(spec, {
  name: 'Run Inference',
  key: 'run_inference',
  description: `Execute a machine learning inference task using a configured inference endpoint. Supports text embedding, sparse embedding, reranking, completion, and chat completion tasks. Can also list, create, update, or delete inference endpoints.`,
  instructions: [
    'Use action "perform" to run inference. Provide the taskType, inferenceId, and appropriate input for the task type.',
    'Use action "update" with taskType, inferenceId, and endpointConfig to update a current inference endpoint.',
    'For text_embedding and sparse_embedding, provide "input" as text strings.',
    'For rerank, provide "input" as an array of text strings and "query" as the query text.',
    'For completion and chat_completion, provide "input" as the prompt text.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['perform', 'list', 'get', 'create', 'update', 'delete'])
        .describe('The inference action to perform'),
      taskType: z
        .enum([
          'sparse_embedding',
          'text_embedding',
          'rerank',
          'completion',
          'chat_completion'
        ])
        .optional()
        .describe('The ML task type'),
      inferenceId: z.string().optional().describe('The inference endpoint ID'),
      input: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Input text or texts for the inference task'),
      query: z.string().optional().describe('Query text for rerank task type'),
      taskSettings: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional task-specific settings'),
      endpointConfig: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Endpoint configuration for create action (service, service_settings, task_settings)'
        )
    })
  )
  .output(
    z.object({
      inferenceResults: z.any().optional().describe('Results from the inference task'),
      endpoints: z.any().optional().describe('List of inference endpoints'),
      acknowledged: z.boolean().optional().describe('Whether the request was acknowledged')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElasticsearchClient({
      baseUrl: ctx.auth.baseUrl,
      authHeader: ctx.auth.authHeader
    });

    switch (ctx.input.action) {
      case 'perform': {
        if (!ctx.input.taskType)
          throw elasticsearchServiceError('taskType is required for perform action');
        if (!ctx.input.inferenceId)
          throw elasticsearchServiceError('inferenceId is required for perform action');
        let body: Record<string, any> = {};
        if (ctx.input.input) body.input = ctx.input.input;
        if (ctx.input.query) body.query = ctx.input.query;
        if (ctx.input.taskSettings) body.task_settings = ctx.input.taskSettings;
        let result = await client.performInference(
          ctx.input.taskType,
          ctx.input.inferenceId,
          body
        );
        return {
          output: { inferenceResults: result },
          message: `Inference task **${ctx.input.taskType}** completed on endpoint **${ctx.input.inferenceId}**.`
        };
      }
      case 'list': {
        let result = await client.getInferenceEndpoint(ctx.input.taskType);
        return {
          output: { endpoints: result },
          message: `Retrieved inference endpoints${ctx.input.taskType ? ` for task type **${ctx.input.taskType}**` : ''}.`
        };
      }
      case 'get': {
        if (!ctx.input.inferenceId)
          throw elasticsearchServiceError('inferenceId is required for get action');
        let result = await client.getInferenceEndpoint(
          ctx.input.taskType,
          ctx.input.inferenceId
        );
        return {
          output: { endpoints: result },
          message: `Retrieved inference endpoint **${ctx.input.inferenceId}**.`
        };
      }
      case 'create': {
        if (!ctx.input.taskType)
          throw elasticsearchServiceError('taskType is required for create action');
        if (!ctx.input.inferenceId)
          throw elasticsearchServiceError('inferenceId is required for create action');
        if (!ctx.input.endpointConfig)
          throw elasticsearchServiceError('endpointConfig is required for create action');
        let result = await client.createInferenceEndpoint(
          ctx.input.taskType,
          ctx.input.inferenceId,
          ctx.input.endpointConfig
        );
        return {
          output: { inferenceResults: result, acknowledged: true },
          message: `Inference endpoint **${ctx.input.inferenceId}** created for task type **${ctx.input.taskType}**.`
        };
      }
      case 'update': {
        if (!ctx.input.taskType)
          throw elasticsearchServiceError('taskType is required for update action');
        if (!ctx.input.inferenceId)
          throw elasticsearchServiceError('inferenceId is required for update action');
        if (!ctx.input.endpointConfig)
          throw elasticsearchServiceError('endpointConfig is required for update action');
        let result = await client.updateInferenceEndpoint(
          ctx.input.taskType,
          ctx.input.inferenceId,
          ctx.input.endpointConfig
        );
        return {
          output: { inferenceResults: result, acknowledged: true },
          message: `Inference endpoint **${ctx.input.inferenceId}** updated for task type **${ctx.input.taskType}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.taskType)
          throw elasticsearchServiceError('taskType is required for delete action');
        if (!ctx.input.inferenceId)
          throw elasticsearchServiceError('inferenceId is required for delete action');
        let result = await client.deleteInferenceEndpoint(
          ctx.input.taskType,
          ctx.input.inferenceId
        );
        return {
          output: { acknowledged: result.acknowledged ?? true },
          message: `Inference endpoint **${ctx.input.inferenceId}** deleted.`
        };
      }
    }
  })
  .build();
