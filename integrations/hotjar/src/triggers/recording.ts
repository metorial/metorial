import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let recordingInputSchema = z.object({
  event: z.string().describe('Event type.'),
  version: z.number().describe('Webhook payload version.'),
  recordingId: z.string().describe('Unique recording identifier.'),
  siteId: z.string().optional().describe('Site identifier.'),
  hotjarUserId: z.string().nullable().describe('Hotjar User ID (UUID).'),
  device: z.string().nullable().describe('Device type: tablet, mobile, or desktop.'),
  browser: z.string().nullable().describe('Browser name.'),
  browserVersion: z.string().nullable().describe('Browser version.'),
  os: z.string().nullable().describe('Operating system name.'),
  osVersion: z.string().nullable().describe('Operating system version.'),
  countryCode: z.string().nullable().describe('ISO 3166 country code.'),
  actionCount: z.number().nullable().describe('Number of user actions in the session.'),
  recordingUrl: z.string().nullable().describe('URL to view the recording in Hotjar.')
});

export let recordingTrigger = SlateTrigger.create(spec, {
  name: 'Recording',
  key: 'recording',
  description:
    'Triggered when a new recording matching your recording segment is created. Webhooks must be configured per recording segment in the Hotjar dashboard. Available on Observe Scale plans.'
})
  .input(recordingInputSchema)
  .output(
    z.object({
      recordingId: z.string().describe('Unique recording identifier.'),
      siteId: z.string().nullable().describe('Site identifier.'),
      hotjarUserId: z.string().nullable().describe('Hotjar User ID (UUID).'),
      device: z.string().nullable().describe('Device type: tablet, mobile, or desktop.'),
      browser: z.string().nullable().describe('Browser name.'),
      browserVersion: z.string().nullable().describe('Browser version.'),
      os: z.string().nullable().describe('Operating system name.'),
      osVersion: z.string().nullable().describe('Operating system version.'),
      countryCode: z.string().nullable().describe('ISO 3166 country code.'),
      actionCount: z.number().nullable().describe('Number of user actions in the session.'),
      recordingUrl: z.string().nullable().describe('URL to view the recording in Hotjar.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      if (body.event === 'test_message') {
        return { inputs: [] };
      }

      if (body.event !== 'recording') {
        return { inputs: [] };
      }

      let data = body.data || {};

      let recordingId = data.id || `rec_${data.hotjar_user_id || Date.now()}`;

      return {
        inputs: [
          {
            event: body.event,
            version: body.version || 1,
            recordingId: String(recordingId),
            siteId: data.site_id ? String(data.site_id) : undefined,
            hotjarUserId: data.hotjar_user_id || null,
            device: data.device || null,
            browser: data.browser || null,
            browserVersion: data.browser_version || null,
            os: data.os || null,
            osVersion: data.os_version || null,
            countryCode: data.country_code || null,
            actionCount: data.action_count ?? null,
            recordingUrl: data.recording_url || null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'recording.created',
        id: ctx.input.recordingId,
        output: {
          recordingId: ctx.input.recordingId,
          siteId: ctx.input.siteId || null,
          hotjarUserId: ctx.input.hotjarUserId,
          device: ctx.input.device,
          browser: ctx.input.browser,
          browserVersion: ctx.input.browserVersion,
          os: ctx.input.os,
          osVersion: ctx.input.osVersion,
          countryCode: ctx.input.countryCode,
          actionCount: ctx.input.actionCount,
          recordingUrl: ctx.input.recordingUrl
        }
      };
    }
  })
  .build();
