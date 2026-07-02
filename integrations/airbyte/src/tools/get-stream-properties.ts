import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getStreamPropertiesTool = SlateTool.create(spec, {
  name: 'Get Stream Properties',
  key: 'get_stream_properties',
  description: `Retrieve available streams and their schemas for an Airbyte source. Returns stream names, supported sync modes, cursor fields, primary keys, and available properties. Useful for configuring which streams to include in a connection.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceId: z.string().describe('UUID of the source to get stream properties for.'),
      destinationId: z
        .string()
        .optional()
        .describe('UUID of the destination to check compatibility with.'),
      ignoreCache: z
        .boolean()
        .optional()
        .describe(
          'If true, pull the latest schema from the source instead of using the cache.'
        )
    })
  )
  .output(
    z.object({
      streams: z.array(
        z.object({
          streamName: z.string(),
          syncModes: z.array(z.string()),
          defaultCursorField: z.array(z.string()).optional(),
          sourceDefinedCursorField: z.boolean().optional(),
          sourceDefinedPrimaryKey: z.array(z.array(z.string())).optional(),
          propertyFields: z.array(z.array(z.string())).optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let streams = await client.getStreamProperties(ctx.input.sourceId, {
      destinationId: ctx.input.destinationId,
      ignoreCache: ctx.input.ignoreCache
    });

    return {
      output: {
        streams: streams.map(s => ({
          streamName: s.streamName,
          syncModes: s.syncModes,
          defaultCursorField: s.defaultCursorField,
          sourceDefinedCursorField: s.sourceDefinedCursorField,
          sourceDefinedPrimaryKey: s.sourceDefinedPrimaryKey,
          propertyFields: s.propertyFields
        }))
      },
      message: `Found **${streams.length}** stream(s) for source.`
    };
  })
  .build();
