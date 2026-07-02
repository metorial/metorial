import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';

let runEventTypes = [
  'ACTOR.RUN.CREATED',
  'ACTOR.RUN.SUCCEEDED',
  'ACTOR.RUN.FAILED',
  'ACTOR.RUN.ABORTED',
  'ACTOR.RUN.TIMED_OUT',
  'ACTOR.RUN.RESURRECTED'
] as const;

export let actorRunEvent = SlateTrigger.create(spec, {
  name: 'Actor Run Event',
  key: 'actor_run_event',
  description:
    'Triggers when an Actor run is created, succeeds, fails, is aborted, times out, or is resurrected. Automatically registers a webhook with Apify.'
})
  .input(
    z.object({
      eventType: z.string().describe('Apify event type (e.g. ACTOR.RUN.SUCCEEDED)'),
      runId: z.string().describe('Actor run ID'),
      actorId: z.string().describe('Actor ID'),
      actorTaskId: z
        .string()
        .optional()
        .describe('Actor task ID (if the run was started from a task)'),
      status: z.string().describe('Run status'),
      startedAt: z.string().optional().describe('ISO timestamp when the run started'),
      finishedAt: z.string().optional().describe('ISO timestamp when the run finished'),
      defaultDatasetId: z.string().optional().describe('Default dataset ID'),
      defaultKeyValueStoreId: z.string().optional().describe('Default key-value store ID'),
      defaultRequestQueueId: z.string().optional().describe('Default request queue ID'),
      buildId: z.string().optional().describe('Build ID used for the run')
    })
  )
  .output(
    z.object({
      runId: z.string().describe('Actor run ID'),
      actorId: z.string().describe('Actor ID'),
      actorTaskId: z.string().optional().describe('Actor task ID (if applicable)'),
      status: z
        .string()
        .describe('Run status (READY, RUNNING, SUCCEEDED, FAILED, ABORTED, TIMED-OUT)'),
      startedAt: z.string().optional().describe('ISO timestamp when the run started'),
      finishedAt: z.string().optional().describe('ISO timestamp when the run finished'),
      defaultDatasetId: z
        .string()
        .optional()
        .describe('Default dataset ID for fetching results'),
      defaultKeyValueStoreId: z.string().optional().describe('Default key-value store ID'),
      defaultRequestQueueId: z.string().optional().describe('Default request queue ID'),
      buildId: z.string().optional().describe('Build ID used for the run')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ApifyClient({ token: ctx.auth.token });

      let webhook = await client.createWebhook({
        eventTypes: [...runEventTypes],
        requestUrl: ctx.input.webhookBaseUrl,
        description: 'Slates integration - Actor run events'
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

      let runId = eventData.actorRunId || resource.id || '';
      let actorId = eventData.actorId || resource.actId || '';
      let actorTaskId = eventData.actorTaskId || resource.actorTaskId;

      return {
        inputs: [
          {
            eventType,
            runId,
            actorId,
            actorTaskId,
            status: resource.status || '',
            startedAt: resource.startedAt,
            finishedAt: resource.finishedAt,
            defaultDatasetId: resource.defaultDatasetId,
            defaultKeyValueStoreId: resource.defaultKeyValueStoreId,
            defaultRequestQueueId: resource.defaultRequestQueueId,
            buildId: resource.buildId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventTypeMap: Record<string, string> = {
        'ACTOR.RUN.CREATED': 'actor_run.created',
        'ACTOR.RUN.SUCCEEDED': 'actor_run.succeeded',
        'ACTOR.RUN.FAILED': 'actor_run.failed',
        'ACTOR.RUN.ABORTED': 'actor_run.aborted',
        'ACTOR.RUN.TIMED_OUT': 'actor_run.timed_out',
        'ACTOR.RUN.RESURRECTED': 'actor_run.resurrected'
      };

      let type = eventTypeMap[ctx.input.eventType] || 'actor_run.unknown';

      return {
        type,
        id: `${ctx.input.runId}-${ctx.input.eventType}`,
        output: {
          runId: ctx.input.runId,
          actorId: ctx.input.actorId,
          actorTaskId: ctx.input.actorTaskId,
          status: ctx.input.status,
          startedAt: ctx.input.startedAt,
          finishedAt: ctx.input.finishedAt,
          defaultDatasetId: ctx.input.defaultDatasetId,
          defaultKeyValueStoreId: ctx.input.defaultKeyValueStoreId,
          defaultRequestQueueId: ctx.input.defaultRequestQueueId,
          buildId: ctx.input.buildId
        }
      };
    }
  })
  .build();
