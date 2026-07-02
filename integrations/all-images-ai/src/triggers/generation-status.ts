import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generationStatus = SlateTrigger.create(spec, {
  name: 'Generation Status Changed',
  key: 'generation_status',
  description:
    'Fires when an image generation changes status — created, active, progress, completed, or failed.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Webhook event type (e.g., print.created, print.completed, print.failed)'),
      eventId: z.string().describe('Unique webhook event ID'),
      generationData: z.any().describe('Generation data from the webhook payload')
    })
  )
  .output(
    z.object({
      generationId: z.string().describe('Generation ID'),
      name: z.string().optional().describe('Generation name'),
      prompt: z.string().optional().describe('The prompt used'),
      status: z
        .number()
        .optional()
        .describe('Status code: 0=created, 1=pending, 2=processing, 3=done, 4=error'),
      statusLabel: z.string().describe('Human-readable status label'),
      images: z
        .array(
          z.object({
            imageId: z.string().describe('Image ID'),
            url: z.string().describe('Preview image URL'),
            urlFull: z.string().describe('Full-size image URL')
          })
        )
        .optional()
        .describe('Generated images (available when completed)'),
      tags: z.array(z.string()).optional().describe('Tags'),
      metaData: z.record(z.string(), z.unknown()).optional().describe('Custom metadata'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client(ctx.auth.token);

      let webhookId = await client.subscribeWebhook({
        url: ctx.input.webhookBaseUrl,
        events: [
          'print.created',
          'print.active',
          'print.progress',
          'print.completed',
          'print.failed'
        ]
      });

      return {
        registrationDetails: { webhookId }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client(ctx.auth.token);
      await client.unsubscribeWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: body.type,
            eventId: body.id,
            generationData: body.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let statusLabels: Record<string, string> = {
        'print.created': 'created',
        'print.active': 'processing',
        'print.progress': 'progress',
        'print.completed': 'completed',
        'print.failed': 'failed'
      };

      let data = ctx.input.generationData ?? {};
      let images = (data.images ?? []).map((img: any) => ({
        imageId: img.id ?? '',
        url: img.url ?? '',
        urlFull: img.urlFull ?? ''
      }));

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          generationId: data.id ?? data.printId ?? ctx.input.eventId,
          name: data.name,
          prompt: data.prompt,
          status: data.status,
          statusLabel: statusLabels[ctx.input.eventType] ?? ctx.input.eventType,
          images: images.length > 0 ? images : undefined,
          tags: data.tags,
          metaData: data.metaData,
          createdAt: data.createdAt
        }
      };
    }
  })
  .build();
