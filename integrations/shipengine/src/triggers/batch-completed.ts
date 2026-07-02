import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let batchCompletedTrigger = SlateTrigger.create(spec, {
  name: 'Batch Completed',
  key: 'batch_completed',
  description: 'Fires when a batch label processing operation completes.'
})
  .input(
    z.object({
      resourceUrl: z.string().optional().describe('URL to the batch resource'),
      batchId: z.string().describe('Batch ID'),
      status: z.string().describe('Batch status'),
      completed: z.number().describe('Number of completed labels'),
      errors: z.number().describe('Number of errors'),
      count: z.number().describe('Total count')
    })
  )
  .output(
    z.object({
      batchId: z.string().describe('Batch ID'),
      status: z.string().describe('Batch status'),
      completed: z.number().describe('Number of completed labels'),
      errors: z.number().describe('Number of errors'),
      count: z.number().describe('Total labels in the batch'),
      labelDownloadUrl: z.string().optional().describe('URL to download batch labels'),
      formDownloadUrl: z.string().optional().describe('URL to download batch forms')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let webhook = await client.createWebhook({
        event: 'batch',
        url: ctx.input.webhookBaseUrl
      });

      return {
        registrationDetails: {
          webhookId: webhook.webhook_id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let batchData = data?.data ?? data ?? {};

      return {
        inputs: [
          {
            resourceUrl: data?.resource_url ?? '',
            batchId: batchData.batch_id ?? '',
            status: batchData.status ?? '',
            completed: batchData.completed ?? 0,
            errors: batchData.errors ?? 0,
            count: batchData.count ?? 0
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let batch: any;
      try {
        batch = await client.getBatch(ctx.input.batchId);
      } catch {
        batch = null;
      }

      return {
        type: 'batch.completed',
        id: `batch-${ctx.input.batchId}-${Date.now()}`,
        output: {
          batchId: ctx.input.batchId,
          status: ctx.input.status,
          completed: ctx.input.completed,
          errors: ctx.input.errors,
          count: ctx.input.count,
          labelDownloadUrl: batch?.label_download?.href,
          formDownloadUrl: batch?.form_download?.href
        }
      };
    }
  })
  .build();
