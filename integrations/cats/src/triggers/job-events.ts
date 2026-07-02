import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let JOB_EVENTS = ['job.created', 'job.updated', 'job.deleted', 'job.status_changed'] as const;

export let jobEvents = SlateTrigger.create(spec, {
  name: 'Job Events',
  key: 'job_events',
  description:
    'Triggers when a job order is created, updated, deleted, or has its status changed.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type'),
      jobId: z.string().describe('Job ID'),
      previousStatusId: z
        .string()
        .optional()
        .describe('Previous status ID (for status changes)'),
      newStatusId: z.string().optional().describe('New status ID (for status changes)'),
      rawPayload: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Job ID'),
      title: z.string().optional().describe('Job title'),
      isActive: z.boolean().optional().describe('Whether active'),
      isHot: z.boolean().optional().describe('Whether hot'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
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
      for (let event of JOB_EVENTS) {
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

      let jobId = data.job_id?.toString() ?? '';
      let eventType = data.event ?? '';

      return {
        inputs: [
          {
            eventType,
            jobId,
            previousStatusId: data.previous_status_id?.toString(),
            newStatusId: data.new_status_id?.toString(),
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let job: any = {};
      if (ctx.input.eventType !== 'job.deleted') {
        try {
          job = await client.getJob(ctx.input.jobId);
        } catch {
          // Job may not exist anymore
        }
      }

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${ctx.input.jobId}-${Date.now()}`,
        output: {
          jobId: ctx.input.jobId,
          title: job.title,
          isActive: job.is_active,
          isHot: job.is_hot,
          city: job.city,
          state: job.state,
          previousStatusId: ctx.input.previousStatusId,
          newStatusId: ctx.input.newStatusId,
          createdAt: job.created_at,
          updatedAt: job.updated_at
        }
      };
    }
  })
  .build();
