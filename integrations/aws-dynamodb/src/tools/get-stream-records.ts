import { SlateTool } from 'slates';
import { z } from 'zod';
import { dynamoDbServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getStreamRecords = SlateTool.create(spec, {
  name: 'Get Stream Records',
  key: 'get_stream_records',
  description: `Read records from a DynamoDB Stream shard.
The tool creates a shard iterator for the requested position and returns the next page of stream records.`,
  constraints: [
    'DynamoDB Streams retain records for up to 24 hours',
    'GetRecords returns at most 1 MB or 1000 records per call'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      streamArn: z.string().describe('ARN of the DynamoDB Stream'),
      shardId: z.string().describe('Shard ID to read from'),
      shardIteratorType: z
        .enum(['TRIM_HORIZON', 'LATEST', 'AT_SEQUENCE_NUMBER', 'AFTER_SEQUENCE_NUMBER'])
        .optional()
        .default('TRIM_HORIZON')
        .describe('Position in the shard to start reading from'),
      sequenceNumber: z
        .string()
        .optional()
        .describe(
          'Required when shardIteratorType is AT_SEQUENCE_NUMBER or AFTER_SEQUENCE_NUMBER'
        ),
      limit: z.number().optional().describe('Maximum number of records to return')
    })
  )
  .output(
    z.object({
      records: z
        .array(
          z.object({
            eventId: z.string().optional(),
            eventName: z.string().optional(),
            awsRegion: z.string().optional(),
            keys: z.record(z.string(), z.any()).optional(),
            newImage: z.record(z.string(), z.any()).optional(),
            oldImage: z.record(z.string(), z.any()).optional(),
            sequenceNumber: z.string().optional(),
            approximateCreationTimestamp: z.string().optional(),
            sizeBytes: z.number().optional(),
            streamViewType: z.string().optional()
          })
        )
        .describe('Stream records read from the shard'),
      nextShardIterator: z
        .string()
        .optional()
        .describe('Iterator to continue reading from this shard'),
      count: z.number().describe('Number of records returned')
    })
  )
  .handleInvocation(async ctx => {
    let shardIteratorType = ctx.input.shardIteratorType ?? 'TRIM_HORIZON';
    let requiresSequenceNumber =
      shardIteratorType === 'AT_SEQUENCE_NUMBER' ||
      shardIteratorType === 'AFTER_SEQUENCE_NUMBER';
    if (requiresSequenceNumber && !ctx.input.sequenceNumber) {
      throw dynamoDbServiceError(
        'sequenceNumber is required when shardIteratorType is AT_SEQUENCE_NUMBER or AFTER_SEQUENCE_NUMBER.'
      );
    }

    let client = createClient(ctx.config, ctx.auth);
    let iteratorResult = await client.getShardIterator({
      streamArn: ctx.input.streamArn,
      shardId: ctx.input.shardId,
      shardIteratorType,
      sequenceNumber: ctx.input.sequenceNumber
    });

    if (!iteratorResult.ShardIterator) {
      throw dynamoDbServiceError('DynamoDB did not return a shard iterator.');
    }

    let result = await client.getRecords({
      shardIterator: iteratorResult.ShardIterator,
      limit: ctx.input.limit
    });
    let records = (result.Records || []).map((record: any) => ({
      eventId: record.eventID,
      eventName: record.eventName,
      awsRegion: record.awsRegion,
      keys: record.dynamodb?.Keys,
      newImage: record.dynamodb?.NewImage,
      oldImage: record.dynamodb?.OldImage,
      sequenceNumber: record.dynamodb?.SequenceNumber,
      approximateCreationTimestamp: record.dynamodb?.ApproximateCreationDateTime
        ? String(record.dynamodb.ApproximateCreationDateTime)
        : undefined,
      sizeBytes: record.dynamodb?.SizeBytes,
      streamViewType: record.dynamodb?.StreamViewType
    }));

    return {
      output: {
        records,
        nextShardIterator: result.NextShardIterator,
        count: records.length
      },
      message: `Read **${records.length}** stream records from shard **${ctx.input.shardId}**`
    };
  })
  .build();
