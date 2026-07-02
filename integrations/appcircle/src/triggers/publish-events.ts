import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let publishEvents = SlateTrigger.create(spec, {
  name: 'Publish Events',
  key: 'publish_events',
  description:
    'Triggers on store publishing lifecycle events including status changes, flow started, succeeded, failed, canceled, and version deployed or rejected.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of publish event'),
      eventId: z.string().describe('Unique identifier for this event'),
      profileId: z.string().optional().describe('Publish profile ID'),
      profileName: z.string().optional().describe('Publish profile name'),
      appVersionId: z.string().optional().describe('App version ID'),
      publishId: z.string().optional().describe('Publish flow ID'),
      platformType: z.string().optional().describe('Platform type'),
      storeStatus: z.string().optional().describe('Store status'),
      raw: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z
      .object({
        profileId: z.string().optional().describe('Publish profile ID'),
        profileName: z.string().optional().describe('Publish profile name'),
        appVersionId: z.string().optional().describe('App version ID'),
        publishId: z.string().optional().describe('Publish flow ID'),
        platformType: z.string().optional().describe('Platform type'),
        storeStatus: z.string().optional().describe('Store status')
      })
      .passthrough()
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body?.action ?? body?.event ?? body?.eventType ?? 'unknown';
      let eventId = body?.id ?? body?.eventId ?? body?.publishId ?? `publish-${Date.now()}`;

      return {
        inputs: [
          {
            eventType: String(eventType),
            eventId: String(eventId),
            profileId: body?.profileId ?? body?.publishProfileId,
            profileName: body?.profileName ?? body?.publishProfileName,
            appVersionId: body?.appVersionId,
            publishId: body?.publishId,
            platformType: body?.platformType,
            storeStatus: body?.storeStatus ?? body?.status,
            raw: body
          }
        ]
      };
    },
    handleEvent: async ctx => {
      return {
        type: `publish.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          profileId: ctx.input.profileId,
          profileName: ctx.input.profileName,
          appVersionId: ctx.input.appVersionId,
          publishId: ctx.input.publishId,
          platformType: ctx.input.platformType,
          storeStatus: ctx.input.storeStatus,
          ...ctx.input.raw
        }
      };
    }
  })
  .build();
