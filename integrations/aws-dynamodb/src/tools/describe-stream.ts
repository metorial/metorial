import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let describeStream = SlateTool.create(spec, {
  name: 'Describe Stream',
  key: 'describe_stream',
  description:
    'Describe a DynamoDB Stream, including status, table name, key schema, and shards.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      streamArn: z.string().describe('ARN of the DynamoDB Stream'),
      limit: z.number().optional().describe('Maximum number of shards to return'),
      exclusiveStartShardId: z
        .string()
        .optional()
        .describe('Shard ID from the previous page for pagination')
    })
  )
  .output(
    z.object({
      streamArn: z.string().describe('ARN of the stream'),
      tableName: z.string().optional().describe('Table associated with the stream'),
      streamStatus: z.string().optional().describe('Current stream status'),
      streamViewType: z.string().optional().describe('Stream view type'),
      streamLabel: z.string().optional().describe('Stream label'),
      creationTimestamp: z.string().optional().describe('When the stream was created'),
      keySchema: z
        .array(
          z.object({
            attributeName: z.string(),
            keyType: z.string()
          })
        )
        .describe('Table key schema for stream records'),
      shards: z
        .array(
          z.object({
            shardId: z.string(),
            parentShardId: z.string().optional(),
            startingSequenceNumber: z.string().optional(),
            endingSequenceNumber: z.string().optional()
          })
        )
        .describe('Stream shards'),
      lastEvaluatedShardId: z.string().optional().describe('Pagination token')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.describeStream({
      streamArn: ctx.input.streamArn,
      limit: ctx.input.limit,
      exclusiveStartShardId: ctx.input.exclusiveStartShardId
    });
    let stream = result.StreamDescription || {};
    let shards = (stream.Shards || []).map((shard: any) => ({
      shardId: shard.ShardId,
      parentShardId: shard.ParentShardId,
      startingSequenceNumber: shard.SequenceNumberRange?.StartingSequenceNumber,
      endingSequenceNumber: shard.SequenceNumberRange?.EndingSequenceNumber
    }));

    return {
      output: {
        streamArn: stream.StreamArn || ctx.input.streamArn,
        tableName: stream.TableName,
        streamStatus: stream.StreamStatus,
        streamViewType: stream.StreamViewType,
        streamLabel: stream.StreamLabel,
        creationTimestamp: stream.CreationRequestDateTime
          ? String(stream.CreationRequestDateTime)
          : undefined,
        keySchema: (stream.KeySchema || []).map((key: any) => ({
          attributeName: key.AttributeName,
          keyType: key.KeyType
        })),
        shards,
        lastEvaluatedShardId: stream.LastEvaluatedShardId
      },
      message: `Stream **${stream.StreamArn || ctx.input.streamArn}** is **${stream.StreamStatus || 'UNKNOWN'}** with **${shards.length}** shards${stream.LastEvaluatedShardId ? ' (more available)' : ''}`
    };
  })
  .build();
