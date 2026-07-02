import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let screenshotCompleted = SlateTrigger.create(spec, {
  name: 'Screenshot Completed',
  key: 'screenshot_completed',
  description:
    'Triggered when an asynchronous screenshot request completes. Receives the screenshot result payload via webhook.'
})
  .input(
    z.object({
      resourceType: z.string().describe('Webhook resource type header value.'),
      url: z.string().optional().describe('Target URL that was screenshotted.'),
      screenshotUrl: z.string().optional().describe('URL to the stored screenshot image.'),
      screenshotId: z
        .string()
        .optional()
        .describe('Unique identifier for this screenshot request.'),
      rawPayload: z.any().describe('Full raw webhook payload.')
    })
  )
  .output(
    z.object({
      url: z.string().optional().describe('Target URL that was screenshotted.'),
      screenshotUrl: z
        .string()
        .optional()
        .describe('URL where the screenshot image is stored.'),
      screenshotId: z
        .string()
        .optional()
        .describe('Unique identifier for this screenshot request.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      let resourceType = ctx.request.headers.get('x-scrapfly-webhook-resource-type') ?? '';

      if (resourceType !== 'screenshot') {
        return { inputs: [] };
      }

      let config = data?.config ?? {};
      let context = data?.context ?? {};

      return {
        inputs: [
          {
            resourceType,
            url: config.url,
            screenshotUrl: data?.screenshot_url ?? context.screenshot_url,
            screenshotId: context.id ?? `screenshot-${Date.now()}`,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'screenshot.completed',
        id: ctx.input.screenshotId ?? `screenshot-${Date.now()}`,
        output: {
          url: ctx.input.url,
          screenshotUrl: ctx.input.screenshotUrl,
          screenshotId: ctx.input.screenshotId
        }
      };
    }
  })
  .build();
