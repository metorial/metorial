import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let streamChanges = SlateTrigger.create(spec, {
  name: 'Table Item Changes',
  key: 'table_item_changes',
  description:
    'Polls DynamoDB Streams for item-level changes (inserts, updates, deletes) on a table with streams enabled.',
  instructions: [
    'The target table must have DynamoDB Streams enabled with an appropriate stream view type',
    'Events are stored in the stream for up to 24 hours'
  ]
})
  .input(
    z.object({
      eventName: z.enum(['INSERT', 'MODIFY', 'REMOVE']).describe('Type of change event'),
      eventId: z.string().describe('Unique identifier for this stream record'),
      tableName: z.string().describe('Name of the table the event occurred on'),
      keys: z.record(z.string(), z.any()).describe('Primary key of the affected item'),
      newImage: z
        .record(z.string(), z.any())
        .optional()
        .describe('Item after the change (if stream view type includes new image)'),
      oldImage: z
        .record(z.string(), z.any())
        .optional()
        .describe('Item before the change (if stream view type includes old image)'),
      sequenceNumber: z.string().optional().describe('Sequence number of the stream record'),
      approximateCreationTimestamp: z
        .string()
        .optional()
        .describe('Approximate time the event occurred'),
      streamArn: z.string().describe('ARN of the stream')
    })
  )
  .output(
    z.object({
      tableName: z.string().describe('Name of the table'),
      keys: z.record(z.string(), z.any()).describe('Primary key of the affected item'),
      newImage: z.record(z.string(), z.any()).optional().describe('Item after the change'),
      oldImage: z.record(z.string(), z.any()).optional().describe('Item before the change'),
      sequenceNumber: z.string().optional().describe('Sequence number of the record'),
      approximateCreationTimestamp: z
        .string()
        .optional()
        .describe('Approximate time the event occurred'),
      streamArn: z.string().describe('ARN of the stream')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx.config, ctx.auth);

      let state = ctx.state || {};
      let shardIterators: Record<string, string> = state.shardIterators || {};
      let processedShards: string[] = state.processedShards || [];
      let streamArn: string | undefined = state.streamArn;
      let tableName: string | undefined = state.tableName;

      // If we don't have a stream ARN yet, find all streams and pick the first one
      // In production, this would be configured per-trigger instance
      if (!streamArn) {
        let streamsResult = await client.listStreams();
        let streams = streamsResult.Streams || [];
        if (streams.length === 0) {
          return {
            inputs: [],
            updatedState: { ...state }
          };
        }
        streamArn = streams[0].StreamArn;
        tableName = streams[0].TableName;
      }

      // Describe the stream to get shards
      let streamDesc = await client.describeStream({ streamArn: streamArn! });
      let shards = streamDesc.StreamDescription?.Shards || [];
      tableName = tableName || streamDesc.StreamDescription?.TableName;

      let inputs: any[] = [];

      for (let shard of shards) {
        let shardId = shard.ShardId;
        if (!shardId) continue;

        let iterator = shardIterators[shardId];

        if (!iterator) {
          // For new shards, start from LATEST to avoid replaying history
          // (TRIM_HORIZON would start from the oldest available record)
          let iterType = processedShards.includes(shardId)
            ? ('AFTER_SEQUENCE_NUMBER' as const)
            : ('LATEST' as const);

          try {
            let iterResult = await client.getShardIterator({
              streamArn: streamArn!,
              shardId,
              shardIteratorType: iterType,
              ...(iterType === 'AFTER_SEQUENCE_NUMBER' && state.lastSequenceNumbers?.[shardId]
                ? { sequenceNumber: state.lastSequenceNumbers[shardId] }
                : {})
            });
            iterator = iterResult.ShardIterator;
          } catch {
            continue;
          }
        }

        if (!iterator) continue;

        try {
          let records = await client.getRecords({
            shardIterator: iterator,
            limit: 100
          });

          // Update the iterator for next poll
          if (records.NextShardIterator) {
            shardIterators[shardId] = records.NextShardIterator;
          } else {
            // Shard is closed
            delete shardIterators[shardId];
            if (!processedShards.includes(shardId)) {
              processedShards.push(shardId);
            }
          }

          for (let record of records.Records || []) {
            inputs.push({
              eventName: record.eventName,
              eventId: record.eventID,
              tableName: tableName || '',
              keys: record.dynamodb?.Keys || {},
              newImage: record.dynamodb?.NewImage,
              oldImage: record.dynamodb?.OldImage,
              sequenceNumber: record.dynamodb?.SequenceNumber,
              approximateCreationTimestamp: record.dynamodb?.ApproximateCreationDateTime
                ? String(record.dynamodb.ApproximateCreationDateTime)
                : undefined,
              streamArn: streamArn!
            });

            // Track last sequence number per shard
            if (!state.lastSequenceNumbers) state.lastSequenceNumbers = {};
            state.lastSequenceNumbers[shardId] = record.dynamodb?.SequenceNumber;
          }
        } catch {
          // Iterator may have expired, remove it so it gets refreshed next poll
          delete shardIterators[shardId];
        }
      }

      // Keep only the last 500 processed shard IDs to prevent unbounded growth
      if (processedShards.length > 500) {
        processedShards = processedShards.slice(-500);
      }

      return {
        inputs,
        updatedState: {
          streamArn,
          tableName,
          shardIterators,
          processedShards,
          lastSequenceNumbers: state.lastSequenceNumbers || {}
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `item.${ctx.input.eventName.toLowerCase()}`,
        id: ctx.input.eventId,
        output: {
          tableName: ctx.input.tableName,
          keys: ctx.input.keys,
          newImage: ctx.input.newImage,
          oldImage: ctx.input.oldImage,
          sequenceNumber: ctx.input.sequenceNumber,
          approximateCreationTimestamp: ctx.input.approximateCreationTimestamp,
          streamArn: ctx.input.streamArn
        }
      };
    }
  })
  .build();
