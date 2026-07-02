import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let distributionEvents = SlateTrigger.create(spec, {
  name: 'Distribution Events',
  key: 'distribution_events',
  description:
    'Triggers on testing distribution events such as new version uploaded, app shared for testing, and distribution profile changes.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of distribution event'),
      eventId: z.string().describe('Unique identifier for this event'),
      profileId: z.string().optional().describe('Distribution profile ID'),
      profileName: z.string().optional().describe('Distribution profile name'),
      appVersionId: z.string().optional().describe('App version ID'),
      appName: z.string().optional().describe('Application name'),
      version: z.string().optional().describe('Version string'),
      raw: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z
      .object({
        profileId: z.string().optional().describe('Distribution profile ID'),
        profileName: z.string().optional().describe('Distribution profile name'),
        appVersionId: z.string().optional().describe('App version ID'),
        appName: z.string().optional().describe('Application name'),
        version: z.string().optional().describe('Version string')
      })
      .passthrough()
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body?.action ?? body?.event ?? body?.eventType ?? 'unknown';
      let eventId = body?.id ?? body?.eventId ?? body?.appVersionId ?? `dist-${Date.now()}`;

      return {
        inputs: [
          {
            eventType: String(eventType),
            eventId: String(eventId),
            profileId: body?.profileId ?? body?.distributionProfileId,
            profileName: body?.profileName ?? body?.distributionProfileName,
            appVersionId: body?.appVersionId,
            appName: body?.appName ?? body?.applicationName,
            version: body?.version ?? body?.appVersion,
            raw: body
          }
        ]
      };
    },
    handleEvent: async ctx => {
      return {
        type: `distribution.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          profileId: ctx.input.profileId,
          profileName: ctx.input.profileName,
          appVersionId: ctx.input.appVersionId,
          appName: ctx.input.appName,
          version: ctx.input.version,
          ...ctx.input.raw
        }
      };
    }
  })
  .build();
