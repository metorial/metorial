import { SlateTool } from 'slates';
import { z } from 'zod';
import { lambdaServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageEventSourceMapping = SlateTool.create(spec, {
  name: 'Manage Event Source Mapping',
  key: 'manage_event_source_mapping',
  description: `Create, update, get, delete, or list event source mappings that connect Lambda to streaming/queue services (SQS, Kinesis, DynamoDB Streams, Kafka, Amazon MQ). Lambda automatically polls the source and invokes the function.`,
  instructions: [
    'Use **action** to specify: "create", "update", "get", "delete", or "list".',
    'For create, provide the eventSourceArn and functionName at minimum.',
    'For Kinesis/DynamoDB Streams, a startingPosition is required (TRIM_HORIZON, LATEST, or AT_TIMESTAMP).'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'get', 'delete', 'list'])
        .describe('Operation to perform'),
      mappingUuid: z
        .string()
        .optional()
        .describe('Event source mapping UUID (required for get/update/delete)'),
      functionName: z.string().optional().describe('Function name or ARN'),
      eventSourceArn: z
        .string()
        .optional()
        .describe('ARN of the event source (SQS, Kinesis, DynamoDB, Kafka, MQ)'),
      enabled: z.boolean().optional().describe('Whether the mapping is active'),
      batchSize: z.number().optional().describe('Maximum records per batch (1-10000)'),
      startingPosition: z
        .enum(['TRIM_HORIZON', 'LATEST', 'AT_TIMESTAMP'])
        .optional()
        .describe('Starting position for stream sources'),
      startingPositionTimestamp: z
        .string()
        .optional()
        .describe('Timestamp for AT_TIMESTAMP starting position (ISO 8601)'),
      maximumBatchingWindowInSeconds: z
        .number()
        .optional()
        .describe('Maximum batching window in seconds'),
      maximumRetryAttempts: z
        .number()
        .optional()
        .describe('Maximum retry attempts (-1 for infinite)'),
      parallelizationFactor: z
        .number()
        .optional()
        .describe('Concurrent batches per shard (1-10)'),
      filterPatterns: z.array(z.string()).optional().describe('Event filter patterns'),
      onFailureDestinationArn: z
        .string()
        .optional()
        .describe('Destination ARN for failed records'),
      bisectBatchOnFunctionError: z
        .boolean()
        .optional()
        .describe('Split batch on error for retry'),
      topics: z.array(z.string()).optional().describe('Kafka topics'),
      queues: z.array(z.string()).optional().describe('MQ queue names'),
      maximumConcurrency: z
        .number()
        .optional()
        .describe('Maximum concurrent function invocations (2-1000)')
    })
  )
  .output(
    z.object({
      mappingUuid: z.string().optional().describe('Event source mapping UUID'),
      mappingArn: z.string().optional().describe('Event source mapping ARN'),
      functionArn: z.string().optional().describe('Function ARN'),
      eventSourceArn: z.string().optional().describe('Event source ARN'),
      state: z.string().optional().describe('Mapping state'),
      batchSize: z.number().optional().describe('Batch size'),
      lastModified: z.string().optional().describe('Last modified timestamp'),
      mappings: z
        .array(
          z.object({
            mappingUuid: z.string().optional(),
            functionArn: z.string().optional(),
            eventSourceArn: z.string().optional(),
            state: z.string().optional(),
            batchSize: z.number().optional()
          })
        )
        .optional()
        .describe('List of mappings (for list action)'),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action } = ctx.input;

    let mapResult = (r: any) => ({
      mappingUuid: r.UUID,
      mappingArn: r.EventSourceMappingArn,
      functionArn: r.FunctionArn,
      eventSourceArn: r.EventSourceArn,
      state: r.State,
      batchSize: r.BatchSize,
      lastModified: r.LastModified ? String(r.LastModified) : undefined
    });

    if (action === 'list') {
      let result = await client.listEventSourceMappings(
        ctx.input.functionName,
        ctx.input.eventSourceArn
      );
      let mappings = (result.EventSourceMappings || []).map((m: any) => ({
        mappingUuid: m.UUID,
        functionArn: m.FunctionArn,
        eventSourceArn: m.EventSourceArn,
        state: m.State,
        batchSize: m.BatchSize
      }));
      return {
        output: { mappings },
        message: `Found **${mappings.length}** event source mapping(s).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.mappingUuid) throw lambdaServiceError('mappingUuid is required');
      let result = await client.getEventSourceMapping(ctx.input.mappingUuid);
      return {
        output: mapResult(result),
        message: `Event source mapping **${result.UUID}** is in state **${result.State}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.mappingUuid) throw lambdaServiceError('mappingUuid is required');
      let result = await client.deleteEventSourceMapping(ctx.input.mappingUuid);
      return {
        output: { ...mapResult(result), deleted: true },
        message: `Deleted event source mapping **${ctx.input.mappingUuid}**.`
      };
    }

    let buildParams = (): Record<string, any> => {
      let params: Record<string, any> = {};
      if (ctx.input.functionName) params.FunctionName = ctx.input.functionName;
      if (ctx.input.eventSourceArn) params.EventSourceArn = ctx.input.eventSourceArn;
      if (ctx.input.enabled !== undefined) params.Enabled = ctx.input.enabled;
      if (ctx.input.batchSize) params.BatchSize = ctx.input.batchSize;
      if (ctx.input.startingPosition) params.StartingPosition = ctx.input.startingPosition;
      if (ctx.input.startingPositionTimestamp)
        params.StartingPositionTimestamp = ctx.input.startingPositionTimestamp;
      if (ctx.input.maximumBatchingWindowInSeconds !== undefined)
        params.MaximumBatchingWindowInSeconds = ctx.input.maximumBatchingWindowInSeconds;
      if (ctx.input.maximumRetryAttempts !== undefined)
        params.MaximumRetryAttempts = ctx.input.maximumRetryAttempts;
      if (ctx.input.parallelizationFactor)
        params.ParallelizationFactor = ctx.input.parallelizationFactor;
      if (ctx.input.filterPatterns)
        params.FilterCriteria = {
          Filters: ctx.input.filterPatterns.map(p => ({ Pattern: p }))
        };
      if (ctx.input.onFailureDestinationArn)
        params.DestinationConfig = {
          OnFailure: { Destination: ctx.input.onFailureDestinationArn }
        };
      if (ctx.input.bisectBatchOnFunctionError !== undefined)
        params.BisectBatchOnFunctionError = ctx.input.bisectBatchOnFunctionError;
      if (ctx.input.topics) params.Topics = ctx.input.topics;
      if (ctx.input.queues) params.Queues = ctx.input.queues;
      if (ctx.input.maximumConcurrency)
        params.ScalingConfig = { MaximumConcurrency: ctx.input.maximumConcurrency };
      return params;
    };

    if (action === 'create') {
      let result = await client.createEventSourceMapping(buildParams());
      return {
        output: mapResult(result),
        message: `Created event source mapping **${result.UUID}** (${result.State}).`
      };
    }

    // update
    if (!ctx.input.mappingUuid) throw lambdaServiceError('mappingUuid is required for update');
    let result = await client.updateEventSourceMapping(ctx.input.mappingUuid, buildParams());
    return {
      output: mapResult(result),
      message: `Updated event source mapping **${result.UUID}** (${result.State}).`
    };
  })
  .build();
