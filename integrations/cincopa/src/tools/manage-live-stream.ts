import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { CincopaClient } from '../lib/client';
import { requireRecords, requireSuccess } from '../lib/response';
import { spec } from '../spec';

export let manageLiveStream = SlateTool.create(spec, {
  name: 'Manage Live Stream',
  key: 'manage_live_stream',
  description: `List, create, start, stop, reset, or delete Cincopa live streams. Use "list" to see all streams, "create" to set up a new stream, "start"/"stop" to control streaming, "reset" to restart the stream configuration, or "delete" to remove a stream.`,
  instructions: [
    'Use action "list" to get all live streams.',
    'Use action "create" with an optional name and description.',
    'Use action "start", "stop", "reset", or "delete" with a streamId.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'start', 'stop', 'reset', 'delete'])
        .describe('Action to perform'),
      streamId: z
        .string()
        .optional()
        .describe('Stream ID (required for start, stop, reset, delete)'),
      name: z.string().optional().describe('Stream name (for create action)'),
      description: z.string().optional().describe('Stream description (for create action)'),
      location: z
        .string()
        .optional()
        .describe('Streaming region for create, such as us_central'),
      streamType: z
        .string()
        .optional()
        .describe('Streaming mode for create, such as passthrough')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      streams: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of live stream objects (for list action)'),
      streamId: z.string().optional().describe('Created stream ID'),
      usage: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Provider live-stream quotas and usage'),
      state: z.string().optional().describe('Provider state after a lifecycle operation'),
      note: z.string().optional().describe('Provider note about the lifecycle operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CincopaClient({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'list') {
      let data = await client.listLiveStreams();
      let streams = requireRecords(
        data?.live_streams ?? data?.streams ?? data?.items,
        'live stream'
      );
      return {
        output: { success: requireSuccess(data), streams, usage: data.usage },
        message: `Found **${streams.length}** live streams.`
      };
    }

    if (action === 'create') {
      let data = await client.createLiveStream({
        name: ctx.input.name,
        description: ctx.input.description,
        location: ctx.input.location,
        type: ctx.input.streamType
      });
      return {
        output: {
          success: requireSuccess(data),
          streamId: data.liveid ?? data.stream_id ?? data.id
        },
        message: 'Created the live stream.'
      };
    }

    if (!ctx.input.streamId) {
      throw createApiServiceError('streamId is required for this action');
    }

    if (action === 'start') {
      let data = await client.startLiveStream(ctx.input.streamId);
      return {
        output: { success: requireSuccess(data), state: data.state, note: data.note },
        message: `Live stream \`${ctx.input.streamId}\` started.`
      };
    }

    if (action === 'stop') {
      let data = await client.stopLiveStream(ctx.input.streamId);
      return {
        output: { success: requireSuccess(data), state: data.state, note: data.note },
        message: `Live stream \`${ctx.input.streamId}\` stopped.`
      };
    }

    if (action === 'reset') {
      let data = await client.resetLiveStream(ctx.input.streamId);
      return {
        output: { success: requireSuccess(data), state: data.state, note: data.note },
        message: `Live stream \`${ctx.input.streamId}\` reset.`
      };
    }

    if (action === 'delete') {
      let data = await client.deleteLiveStream(ctx.input.streamId);
      return {
        output: { success: requireSuccess(data), state: data.state, note: data.note },
        message: `Live stream \`${ctx.input.streamId}\` deleted.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
