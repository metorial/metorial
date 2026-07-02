import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';

let buildEventTypes = [
  'ACTOR.BUILD.CREATED',
  'ACTOR.BUILD.SUCCEEDED',
  'ACTOR.BUILD.FAILED',
  'ACTOR.BUILD.ABORTED',
  'ACTOR.BUILD.TIMED_OUT'
] as const;

export let actorBuildEvent = SlateTrigger.create(spec, {
  name: 'Actor Build Event',
  key: 'actor_build_event',
  description:
    'Triggers when an Actor build is created, succeeds, fails, is aborted, or times out. Automatically registers a webhook with Apify.'
})
  .input(
    z.object({
      eventType: z.string().describe('Apify event type (e.g. ACTOR.BUILD.SUCCEEDED)'),
      buildId: z.string().describe('Actor build ID'),
      actorId: z.string().describe('Actor ID'),
      status: z.string().describe('Build status'),
      startedAt: z.string().optional().describe('ISO timestamp when the build started'),
      finishedAt: z.string().optional().describe('ISO timestamp when the build finished'),
      buildNumber: z.string().optional().describe('Build number')
    })
  )
  .output(
    z.object({
      buildId: z.string().describe('Actor build ID'),
      actorId: z.string().describe('Actor ID'),
      status: z
        .string()
        .describe('Build status (READY, RUNNING, SUCCEEDED, FAILED, ABORTED, TIMED-OUT)'),
      startedAt: z.string().optional().describe('ISO timestamp when the build started'),
      finishedAt: z.string().optional().describe('ISO timestamp when the build finished'),
      buildNumber: z.string().optional().describe('Build number')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ApifyClient({ token: ctx.auth.token });

      let webhook = await client.createWebhook({
        eventTypes: [...buildEventTypes],
        requestUrl: ctx.input.webhookBaseUrl,
        description: 'Slates integration - Actor build events'
      });

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ApifyClient({ token: ctx.auth.token });
      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(webhookId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let eventType = data.eventType || '';
      let eventData = data.eventData || {};
      let resource = data.resource || {};

      let buildId = eventData.actorBuildId || resource.id || '';
      let actorId = eventData.actorId || resource.actId || '';

      return {
        inputs: [
          {
            eventType,
            buildId,
            actorId,
            status: resource.status || '',
            startedAt: resource.startedAt,
            finishedAt: resource.finishedAt,
            buildNumber: resource.buildNumber
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventTypeMap: Record<string, string> = {
        'ACTOR.BUILD.CREATED': 'actor_build.created',
        'ACTOR.BUILD.SUCCEEDED': 'actor_build.succeeded',
        'ACTOR.BUILD.FAILED': 'actor_build.failed',
        'ACTOR.BUILD.ABORTED': 'actor_build.aborted',
        'ACTOR.BUILD.TIMED_OUT': 'actor_build.timed_out'
      };

      let type = eventTypeMap[ctx.input.eventType] || 'actor_build.unknown';

      return {
        type,
        id: `${ctx.input.buildId}-${ctx.input.eventType}`,
        output: {
          buildId: ctx.input.buildId,
          actorId: ctx.input.actorId,
          status: ctx.input.status,
          startedAt: ctx.input.startedAt,
          finishedAt: ctx.input.finishedAt,
          buildNumber: ctx.input.buildNumber
        }
      };
    }
  })
  .build();
