import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newImageGenerated = SlateTrigger.create(spec, {
  name: 'New Image Generated',
  key: 'new_image_generated',
  description: 'Triggers when a new image is generated from a specific DynaPictures template.'
})
  .input(
    z.object({
      templateId: z.string().describe('Template ID that this webhook is scoped to'),
      imageId: z.string().describe('ID of the generated image'),
      imageUrl: z.string().describe('URL of the generated image'),
      thumbnailUrl: z.string().describe('URL of the image thumbnail'),
      retinaThumbnailUrl: z.string().optional().describe('URL of the retina thumbnail'),
      metadata: z.string().optional().describe('Custom metadata attached to the image'),
      width: z.number().describe('Image width in pixels'),
      height: z.number().describe('Image height in pixels')
    })
  )
  .output(
    z.object({
      imageId: z.string().describe('ID of the generated image'),
      templateId: z.string().describe('Template ID the image was generated from'),
      imageUrl: z.string().describe('URL of the generated image'),
      thumbnailUrl: z.string().describe('URL of the image thumbnail'),
      retinaThumbnailUrl: z.string().optional().describe('URL of the retina thumbnail'),
      metadata: z.string().optional().describe('Custom metadata attached to the image'),
      width: z.number().describe('Image width in pixels'),
      height: z.number().describe('Image height in pixels')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let templateId = (ctx.state as Record<string, string> | undefined)?.templateId || '';

      let subscription = await client.subscribeWebhook(
        ctx.input.webhookBaseUrl,
        'NEW_IMAGE',
        templateId
      );

      return {
        registrationDetails: {
          uid: subscription.uid,
          templateId: templateId,
          targetUrl: ctx.input.webhookBaseUrl,
          eventType: 'NEW_IMAGE'
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let details = ctx.input.registrationDetails as {
        templateId: string;
        targetUrl: string;
        eventType: string;
      };

      await client.unsubscribeWebhook(
        details.targetUrl,
        details.eventType,
        details.templateId
      );
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      return {
        inputs: [
          {
            templateId: (data.templateId as string) || '',
            imageId: (data.id as string) || '',
            imageUrl: (data.imageUrl as string) || '',
            thumbnailUrl: (data.thumbnailUrl as string) || '',
            retinaThumbnailUrl: (data.retinaThumbnailUrl as string) || undefined,
            metadata: (data.metadata as string) || undefined,
            width: (data.width as number) || 0,
            height: (data.height as number) || 0
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'image.generated',
        id: ctx.input.imageId,
        output: {
          imageId: ctx.input.imageId,
          templateId: ctx.input.templateId,
          imageUrl: ctx.input.imageUrl,
          thumbnailUrl: ctx.input.thumbnailUrl,
          retinaThumbnailUrl: ctx.input.retinaThumbnailUrl,
          metadata: ctx.input.metadata,
          width: ctx.input.width,
          height: ctx.input.height
        }
      };
    }
  })
  .build();
