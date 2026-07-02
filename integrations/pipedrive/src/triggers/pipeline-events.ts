import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let pipelineEvents = SlateTrigger.create(spec, {
  name: 'Pipeline & Stage Events',
  key: 'pipeline_events',
  description:
    'Triggers when a pipeline or stage is created, updated, or deleted in Pipedrive. Combines pipeline and stage events into a single trigger.'
})
  .input(
    z.object({
      action: z.enum(['created', 'changed', 'deleted']).describe('Event action type'),
      eventId: z.string().describe('Unique event identifier'),
      objectType: z
        .enum(['pipeline', 'stage'])
        .describe('Whether the event is for a pipeline or stage'),
      current: z.any().optional().describe('Current state'),
      previous: z.any().optional().describe('Previous state')
    })
  )
  .output(
    z.object({
      resourceType: z
        .enum(['pipeline', 'stage'])
        .describe('Whether this is a pipeline or stage'),
      pipelineId: z.number().optional().describe('Pipeline ID'),
      stageId: z.number().optional().nullable().describe('Stage ID (for stage events)'),
      name: z.string().optional().describe('Name'),
      orderNr: z.number().optional().describe('Order number'),
      active: z.boolean().optional().describe('Whether active'),
      addTime: z.string().optional().describe('Creation timestamp'),
      updateTime: z.string().optional().nullable().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let [pipelineResult, stageResult] = await Promise.all([
        client.createWebhook({
          subscription_url: `${ctx.input.webhookBaseUrl}/pipeline`,
          event_action: '*',
          event_object: 'pipeline'
        }),
        client.createWebhook({
          subscription_url: `${ctx.input.webhookBaseUrl}/stage`,
          event_action: '*',
          event_object: 'stage'
        })
      ]);

      return {
        registrationDetails: {
          pipelineWebhookId: pipelineResult?.data?.id,
          stageWebhookId: stageResult?.data?.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let details = ctx.input.registrationDetails;

      let promises: Promise<any>[] = [];
      if (details?.pipelineWebhookId) {
        promises.push(client.deleteWebhook(details.pipelineWebhookId));
      }
      if (details?.stageWebhookId) {
        promises.push(client.deleteWebhook(details.stageWebhookId));
      }
      await Promise.all(promises);
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();
      let action = data.meta?.action;
      let current = data.current;
      let previous = data.previous;
      let objectType = data.meta?.object as string;

      let actionMap: Record<string, string> = {
        added: 'created',
        updated: 'changed',
        deleted: 'deleted'
      };

      let resolvedType: 'pipeline' | 'stage' = objectType === 'stage' ? 'stage' : 'pipeline';

      return {
        inputs: [
          {
            action: actionMap[action] || action,
            eventId: `${resolvedType}-${current?.id || previous?.id}-${data.meta?.timestamp || Date.now()}`,
            objectType: resolvedType,
            current,
            previous
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let entity = ctx.input.current || ctx.input.previous || {};

      return {
        type: `${ctx.input.objectType}.${ctx.input.action}`,
        id: ctx.input.eventId,
        output: {
          resourceType: ctx.input.objectType,
          pipelineId: ctx.input.objectType === 'pipeline' ? entity.id : entity.pipeline_id,
          stageId: ctx.input.objectType === 'stage' ? entity.id : null,
          name: entity.name,
          orderNr: entity.order_nr,
          active: entity.active ?? entity.active_flag,
          addTime: entity.add_time,
          updateTime: entity.update_time
        }
      };
    }
  });
