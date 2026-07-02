import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let PIPELINE_EVENTS = [
  'pipeline.created',
  'pipeline.deleted',
  'pipeline.status_changed'
] as const;

export let pipelineEvents = SlateTrigger.create(spec, {
  name: 'Pipeline Events',
  key: 'pipeline_events',
  description:
    'Triggers when a candidate is added to, removed from, or changes status in a job pipeline.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type'),
      pipelineId: z.string().describe('Pipeline ID'),
      previousStatusId: z.string().optional().describe('Previous status ID'),
      newStatusId: z.string().optional().describe('New status ID'),
      rawPayload: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      pipelineId: z.string().describe('Pipeline ID'),
      candidateId: z.string().optional().describe('Candidate ID'),
      jobId: z.string().optional().describe('Job ID'),
      rating: z.number().optional().describe('Rating'),
      statusId: z.string().optional().describe('Current status ID'),
      previousStatusId: z.string().optional().describe('Previous status ID'),
      newStatusId: z.string().optional().describe('New status ID'),
      createdAt: z.string().optional().describe('Created date'),
      updatedAt: z.string().optional().describe('Updated date')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhookIds: string[] = [];
      for (let event of PIPELINE_EVENTS) {
        let result = await client.createWebhook({
          url: ctx.input.webhookBaseUrl,
          event
        });
        let webhookId =
          result?.id?.toString() ?? result?._links?.self?.href?.split('/').pop() ?? '';
        webhookIds.push(webhookId);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details?.webhookIds ?? []) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      let pipelineId = data.pipeline_id?.toString() ?? '';
      let eventType = data.event ?? '';

      return {
        inputs: [
          {
            eventType,
            pipelineId,
            previousStatusId: data.previous_status_id?.toString(),
            newStatusId: data.new_status_id?.toString(),
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let pipeline: any = {};
      if (ctx.input.eventType !== 'pipeline.deleted') {
        try {
          pipeline = await client.getPipeline(ctx.input.pipelineId);
        } catch {
          // Pipeline may not exist anymore
        }
      }

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${ctx.input.pipelineId}-${Date.now()}`,
        output: {
          pipelineId: ctx.input.pipelineId,
          candidateId: pipeline.candidate_id?.toString(),
          jobId: pipeline.job_id?.toString(),
          rating: pipeline.rating,
          statusId: pipeline.status_id?.toString(),
          previousStatusId: ctx.input.previousStatusId,
          newStatusId: ctx.input.newStatusId,
          createdAt: pipeline.created_at,
          updatedAt: pipeline.updated_at
        }
      };
    }
  })
  .build();
