import { SlateTool } from 'slates';
import { z } from 'zod';
import { FaradayClient } from '../lib/client';
import { spec } from '../spec';

let streamSchema = z.object({
  streamId: z.string().describe('Unique identifier of the stream'),
  name: z.string().describe('Human-readable name of the stream'),
  status: z
    .string()
    .optional()
    .describe('Current status: new, starting, running, ready, or error'),
  datasetId: z.string().optional().describe('UUID of the associated dataset'),
  createdAt: z.string().optional().describe('Timestamp when the stream was created'),
  updatedAt: z.string().optional().describe('Timestamp when the stream was last updated')
});

export let listStreams = SlateTool.create(spec, {
  name: 'List Streams',
  key: 'list_streams',
  description: `Retrieve all event streams in your Faraday account. Streams represent typed sequences of customer actions (e.g., transactions, signups, cancellations) with timestamps and optional values, which feed into cohorts and predictions.`,
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      streams: z.array(streamSchema).describe('List of all event streams')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    let streams = await client.listStreams();

    let mapped = streams.map((s: any) => ({
      streamId: s.id,
      name: s.name,
      status: s.status,
      datasetId: s.dataset_id,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));

    return {
      output: { streams: mapped },
      message: `Found **${mapped.length}** stream(s).`
    };
  })
  .build();

export let getStream = SlateTool.create(spec, {
  name: 'Get Stream',
  key: 'get_stream',
  description: `Retrieve detailed information about a specific event stream, including its dataset association, status, and event configuration.`,
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      streamIdOrName: z.string().describe('UUID or name of the stream to retrieve')
    })
  )
  .output(streamSchema)
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    let s = await client.getStream(ctx.input.streamIdOrName);

    return {
      output: {
        streamId: s.id,
        name: s.name,
        status: s.status,
        datasetId: s.dataset_id,
        createdAt: s.created_at,
        updatedAt: s.updated_at
      },
      message: `Stream **${s.name}** is **${s.status}**.`
    };
  })
  .build();
