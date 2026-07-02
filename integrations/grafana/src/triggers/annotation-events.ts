import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { GrafanaClient } from '../lib/client';
import { spec } from '../spec';

export let annotationEvents = SlateTrigger.create(spec, {
  name: 'Annotation Events',
  key: 'annotation_events',
  description:
    '[Polling fallback] Polls for new annotations in Grafana. Detects when annotations are created or updated, such as deployment markers, incident notes, or other event markers on dashboards.'
})
  .input(
    z.object({
      annotationId: z.number().describe('ID of the annotation'),
      text: z.string().optional().describe('Annotation text'),
      dashboardUid: z.string().optional().describe('Dashboard UID if panel-bound'),
      panelId: z.number().optional().describe('Panel ID if panel-bound'),
      tags: z.array(z.string()).optional().describe('Annotation tags'),
      time: z.number().optional().describe('Start time in epoch milliseconds'),
      timeEnd: z.number().optional().describe('End time in epoch milliseconds'),
      created: z.number().optional().describe('Creation timestamp in epoch milliseconds'),
      updated: z.number().optional().describe('Last update timestamp in epoch milliseconds'),
      login: z.string().optional().describe('User who created/updated the annotation')
    })
  )
  .output(
    z.object({
      annotationId: z.number().describe('Annotation ID'),
      text: z.string().optional().describe('Annotation text content'),
      dashboardUid: z.string().optional().describe('Associated dashboard UID'),
      panelId: z.number().optional().describe('Associated panel ID'),
      tags: z.array(z.string()).optional().describe('Annotation tags'),
      time: z.number().optional().describe('Annotation start time'),
      timeEnd: z.number().optional().describe('Annotation end time'),
      created: z.number().optional().describe('When the annotation was created'),
      updated: z.number().optional().describe('When the annotation was last updated'),
      login: z.string().optional().describe('User login who created the annotation')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new GrafanaClient({
        instanceUrl: ctx.config.instanceUrl,
        token: ctx.auth.token,
        organizationId: ctx.config.organizationId
      });

      let state = ctx.state as { lastPollTime?: number } | null;
      let lastPollTime = state?.lastPollTime || Date.now() - 60_000;

      let annotations = await client.findAnnotations({
        from: lastPollTime,
        limit: 100
      });

      let inputs = annotations
        .filter((a: any) => {
          let annotationTime = a.updated || a.created || a.time || 0;
          return annotationTime >= lastPollTime;
        })
        .map((a: any) => ({
          annotationId: a.id,
          text: a.text,
          dashboardUid: a.dashboardUID,
          panelId: a.panelId,
          tags: a.tags,
          time: a.time,
          timeEnd: a.timeEnd,
          created: a.created,
          updated: a.updated,
          login: a.login
        }));

      return {
        inputs,
        updatedState: {
          lastPollTime: Date.now()
        }
      };
    },

    handleEvent: async ctx => {
      let isUpdate =
        ctx.input.updated && ctx.input.created && ctx.input.updated > ctx.input.created;
      let eventType = isUpdate ? 'annotation.updated' : 'annotation.created';

      return {
        type: eventType,
        id: `annotation-${ctx.input.annotationId}-${ctx.input.updated || ctx.input.created || Date.now()}`,
        output: {
          annotationId: ctx.input.annotationId,
          text: ctx.input.text,
          dashboardUid: ctx.input.dashboardUid,
          panelId: ctx.input.panelId,
          tags: ctx.input.tags,
          time: ctx.input.time,
          timeEnd: ctx.input.timeEnd,
          created: ctx.input.created,
          updated: ctx.input.updated,
          login: ctx.input.login
        }
      };
    }
  })
  .build();
