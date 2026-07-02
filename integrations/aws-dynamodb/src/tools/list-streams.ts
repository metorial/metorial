import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listStreams = SlateTool.create(spec, {
  name: 'List Streams',
  key: 'list_streams',
  description:
    'List DynamoDB Streams in the configured region, optionally filtered to one table.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tableName: z
        .string()
        .optional()
        .describe('Only return streams associated with this table'),
      limit: z.number().optional().describe('Maximum number of streams to return'),
      exclusiveStartStreamArn: z
        .string()
        .optional()
        .describe('Stream ARN from the previous page for pagination')
    })
  )
  .output(
    z.object({
      streams: z
        .array(
          z.object({
            streamArn: z.string(),
            tableName: z.string().optional(),
            streamLabel: z.string().optional()
          })
        )
        .describe('Stream descriptors'),
      lastEvaluatedStreamArn: z
        .string()
        .optional()
        .describe('Pagination token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.listStreams({
      tableName: ctx.input.tableName,
      limit: ctx.input.limit,
      exclusiveStartStreamArn: ctx.input.exclusiveStartStreamArn
    });
    let streams = (result.Streams || []).map((stream: any) => ({
      streamArn: stream.StreamArn,
      tableName: stream.TableName,
      streamLabel: stream.StreamLabel
    }));

    return {
      output: {
        streams,
        lastEvaluatedStreamArn: result.LastEvaluatedStreamArn
      },
      message: `Found **${streams.length}** DynamoDB streams${ctx.input.tableName ? ` for **${ctx.input.tableName}**` : ''}${result.LastEvaluatedStreamArn ? ' (more available)' : ''}`
    };
  })
  .build();
