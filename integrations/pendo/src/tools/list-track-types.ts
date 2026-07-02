import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createPendoClient, validateMultiAppFilter } from './helpers';

export let listTrackTypes = SlateTool.create(spec, {
  name: 'List Track Types',
  key: 'list_track_types',
  description: `List custom track event types known to Pendo. Optionally filter by application ID or expand across all applications in a multi-app subscription.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appId: z
        .string()
        .optional()
        .describe('Application ID to filter track types for a specific app'),
      expandAll: z
        .boolean()
        .optional()
        .describe(
          'Set to true to return track types from all apps in a multi-app subscription'
        )
    })
  )
  .output(
    z.object({
      trackTypes: z
        .array(
          z.object({
            trackTypeId: z.string().describe('Track type ID'),
            name: z.string().describe('Track event name'),
            raw: z.any().describe('Full raw track type record from Pendo')
          })
        )
        .describe('List of track event types'),
      totalCount: z.number().describe('Total number of track types returned')
    })
  )
  .handleInvocation(async ctx => {
    validateMultiAppFilter(ctx.input);
    let client = createPendoClient(ctx);
    let trackTypes = await client.listTrackTypes({
      appId: ctx.input.appId,
      expandAll: ctx.input.expandAll
    });

    let mappedTrackTypes = (Array.isArray(trackTypes) ? trackTypes : []).map(
      (trackType: any) => ({
        trackTypeId: trackType.id || trackType.trackTypeId || '',
        name: trackType.name || trackType.event || '',
        raw: trackType
      })
    );

    return {
      output: {
        trackTypes: mappedTrackTypes,
        totalCount: mappedTrackTypes.length
      },
      message: `Found **${mappedTrackTypes.length}** track type(s) in Pendo.`
    };
  })
  .build();
