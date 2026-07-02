import { SlateTool } from 'slates';
import { z } from 'zod';
import { StitchConnectClient } from '../lib/client';
import { spec } from '../spec';

export let listStreams = SlateTool.create(spec, {
  name: 'List Streams',
  key: 'list_streams',
  description: `Lists all available streams (tables) for a data source, including their selection status and replication metadata. Use this to discover what data is available for replication and which streams are currently selected.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceId: z.number().describe('ID of the source to list streams for')
    })
  )
  .output(
    z.object({
      streams: z
        .array(
          z.object({
            streamId: z.number().describe('Unique stream ID'),
            streamName: z.string().describe('Name of the stream/table'),
            tapStreamId: z.string().optional().describe('Tap-level stream identifier'),
            selected: z
              .boolean()
              .nullable()
              .describe('Whether the stream is selected for replication'),
            replicationMethod: z
              .string()
              .nullable()
              .describe('Replication method (INCREMENTAL, FULL_TABLE, LOG_BASED)'),
            replicationKey: z
              .string()
              .nullable()
              .describe('Column used for incremental replication'),
            metadata: z
              .any()
              .optional()
              .describe('Stream metadata including field-level details')
          })
        )
        .describe('Available streams for the source')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      clientId: ctx.config.clientId
    });

    let rawStreams = await client.listStreams(ctx.input.sourceId);
    let streamList = Array.isArray(rawStreams) ? rawStreams : rawStreams?.streams || [];

    let streams = streamList.map((s: any) => {
      let breadcrumb = s.metadata?.find?.((m: any) => m.breadcrumb?.length === 0);
      let metadata = breadcrumb?.metadata || {};
      return {
        streamId: s.stream_id,
        streamName: s.stream_name || s.tap_stream_id,
        tapStreamId: s.tap_stream_id,
        selected: metadata.selected ?? s.selected ?? null,
        replicationMethod: metadata['replication-method'] || null,
        replicationKey: metadata['replication-key'] || null,
        metadata: s.metadata
      };
    });

    let selectedCount = streams.filter((s: any) => s.selected).length;

    return {
      output: { streams },
      message: `Found **${streams.length}** stream(s) for source ${ctx.input.sourceId}. **${selectedCount}** selected for replication.`
    };
  })
  .build();

export let getStream = SlateTool.create(spec, {
  name: 'Get Stream',
  key: 'get_stream',
  description: `Retrieves detailed schema and metadata for a specific stream (table), including all available fields and their properties. Use this to inspect a stream's structure before configuring field selection.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceId: z.number().describe('ID of the source'),
      streamId: z.number().describe('ID of the stream to retrieve')
    })
  )
  .output(
    z.object({
      streamId: z.number().describe('Stream ID'),
      streamName: z.string().describe('Stream/table name'),
      schema: z.any().optional().describe('JSON Schema describing the stream fields'),
      metadata: z.any().optional().describe('Stream and field-level metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      clientId: ctx.config.clientId
    });

    let stream = await client.getStream(ctx.input.sourceId, ctx.input.streamId);

    return {
      output: {
        streamId: stream.stream_id,
        streamName: stream.stream_name || stream.tap_stream_id,
        schema: stream.schema,
        metadata: stream.metadata
      },
      message: `Retrieved stream **${stream.stream_name || stream.tap_stream_id}** (ID: ${stream.stream_id}).`
    };
  })
  .build();

export let updateStreamSelection = SlateTool.create(spec, {
  name: 'Update Stream Selection',
  key: 'update_stream_selection',
  description: `Selects or deselects streams (tables) and fields (columns) for replication. Configure which data to replicate and the replication method for each stream. At least one stream and one field must be selected for replication to proceed.`,
  instructions: [
    'Use "list_streams" to see available streams and their current selection status.',
    'Use "get_stream" to see field-level details before updating.',
    'Each entry in the streams array should include the stream ID and the metadata to update.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sourceId: z.number().describe('ID of the source'),
      streams: z
        .array(
          z.object({
            tapStreamId: z.string().describe('Tap-level stream identifier'),
            selected: z
              .boolean()
              .optional()
              .describe('Whether to select this stream for replication'),
            replicationMethod: z
              .enum(['INCREMENTAL', 'FULL_TABLE', 'LOG_BASED'])
              .optional()
              .describe('Replication method'),
            replicationKey: z
              .string()
              .optional()
              .describe('Column to use as replication key (for INCREMENTAL)'),
            fields: z
              .array(
                z.object({
                  fieldName: z.string().describe('Name of the field/column'),
                  selected: z
                    .boolean()
                    .describe('Whether to select this field for replication')
                })
              )
              .optional()
              .describe('Field-level selection overrides')
          })
        )
        .describe('Streams to update with their metadata')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful'),
      updatedStreamCount: z.number().describe('Number of streams updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      clientId: ctx.config.clientId
    });

    let streamUpdates = ctx.input.streams.map(s => {
      let metadata: any[] = [];

      // Stream-level metadata
      let streamMeta: Record<string, any> = {};
      if (s.selected !== undefined) streamMeta.selected = s.selected;
      if (s.replicationMethod) streamMeta['replication-method'] = s.replicationMethod;
      if (s.replicationKey) streamMeta['replication-key'] = s.replicationKey;

      if (Object.keys(streamMeta).length > 0) {
        metadata.push({
          breadcrumb: [],
          metadata: streamMeta
        });
      }

      // Field-level metadata
      if (s.fields) {
        for (let field of s.fields) {
          metadata.push({
            breadcrumb: ['properties', field.fieldName],
            metadata: { selected: field.selected }
          });
        }
      }

      return {
        tap_stream_id: s.tapStreamId,
        metadata
      };
    });

    await client.updateStreamMetadata(ctx.input.sourceId, streamUpdates);

    return {
      output: {
        success: true,
        updatedStreamCount: ctx.input.streams.length
      },
      message: `Updated selection for **${ctx.input.streams.length}** stream(s) on source ${ctx.input.sourceId}.`
    };
  })
  .build();
