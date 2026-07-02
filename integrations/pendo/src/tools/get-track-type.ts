import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createPendoClient, firstPendoRecord } from './helpers';

export let getTrackType = SlateTool.create(spec, {
  name: 'Get Track Type',
  key: 'get_track_type',
  description: `Retrieve a specific Pendo track event type by track type ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      trackTypeId: z.string().describe('The track type ID to retrieve')
    })
  )
  .output(
    z.object({
      trackTypeId: z.string().describe('Track type ID'),
      name: z.string().describe('Track event name'),
      raw: z.any().describe('Full raw track type record from Pendo')
    })
  )
  .handleInvocation(async ctx => {
    let client = createPendoClient(ctx);
    let trackType = firstPendoRecord(await client.getTrackType(ctx.input.trackTypeId));

    return {
      output: {
        trackTypeId: trackType.id || trackType.trackTypeId || ctx.input.trackTypeId,
        name: trackType.name || trackType.event || '',
        raw: trackType
      },
      message: `Retrieved track type **${trackType.name || trackType.event || ctx.input.trackTypeId}** from Pendo.`
    };
  })
  .build();
