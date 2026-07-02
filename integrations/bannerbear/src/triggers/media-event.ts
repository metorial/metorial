import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { spec } from '../spec';

let mediaEventTypes = [
  'image_created',
  'collection_created',
  'video_created',
  'animated_gif_created',
  'movie_created',
  'screenshot_created'
] as const;

export let mediaEvent = SlateTrigger.create(spec, {
  name: 'Media Generated',
  key: 'media_event',
  description:
    'Triggers when media is generated in the Bannerbear project: images, collections, videos, animated GIFs, movies, or screenshots.'
})
  .input(
    z.object({
      eventType: z.enum(mediaEventTypes).describe('Type of media event'),
      resourceUid: z.string().describe('UID of the generated resource'),
      status: z.string().describe('Rendering status'),
      mediaUrl: z.string().nullable().describe('URL of the generated media'),
      mediaUrlPng: z.string().nullable().describe('PNG URL (for images)'),
      pdfUrl: z.string().nullable().describe('PDF URL (for images with render_pdf)'),
      templateUid: z.string().nullable().describe('UID of the template used'),
      metadata: z.any().nullable().describe('Custom metadata attached to the request'),
      createdAt: z.string().describe('Timestamp when the resource was created')
    })
  )
  .output(
    z.object({
      resourceUid: z.string().describe('UID of the generated resource'),
      mediaType: z
        .string()
        .describe('Type of media (image, collection, video, animated_gif, movie, screenshot)'),
      status: z.string().describe('Rendering status'),
      mediaUrl: z.string().nullable().describe('URL of the generated media'),
      mediaUrlPng: z.string().nullable().describe('PNG URL (for images)'),
      pdfUrl: z.string().nullable().describe('PDF URL (for images with render_pdf)'),
      templateUid: z.string().nullable().describe('UID of the template used'),
      metadata: z.any().nullable().describe('Custom metadata'),
      createdAt: z.string().describe('Timestamp when the resource was created')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new BannerbearClient({ token: ctx.auth.token });

      let webhookUids: Record<string, string> = {};

      for (let eventType of mediaEventTypes) {
        let webhook = await client.createWebhook({
          url: `${ctx.input.webhookBaseUrl}/${eventType}`,
          event: eventType
        });
        webhookUids[eventType] = webhook.uid;
      }

      return {
        registrationDetails: { webhookUids }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new BannerbearClient({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        webhookUids: Record<string, string>;
      };

      for (let uid of Object.values(details.webhookUids)) {
        await client.deleteWebhook(uid).catch(() => {});
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let url = new URL(ctx.request.url);
      let pathSegments = url.pathname.split('/');
      let lastSegment = pathSegments[pathSegments.length - 1];

      let eventType = mediaEventTypes.find(t => t === lastSegment) || 'image_created';

      // Extract media URL based on resource type
      let mediaUrl: string | null = null;
      let mediaUrlPng: string | null = null;
      let pdfUrl: string | null = null;
      let templateUid: string | null = null;

      if (eventType === 'image_created') {
        mediaUrl = data.image_url || null;
        mediaUrlPng = data.image_url_png || null;
        pdfUrl = data.pdf_url || null;
        templateUid = data.template || null;
      } else if (eventType === 'video_created') {
        mediaUrl = data.video_url || null;
        templateUid = data.video_template || null;
      } else if (eventType === 'animated_gif_created') {
        mediaUrl = data.image_url || null;
        templateUid = data.template || null;
      } else if (eventType === 'collection_created') {
        mediaUrl = data.image_urls ? JSON.stringify(data.image_urls) : null;
        templateUid = data.template_set || null;
      } else if (eventType === 'movie_created') {
        mediaUrl = data.video_url || null;
      } else if (eventType === 'screenshot_created') {
        mediaUrl = data.screenshot_image_url || null;
      }

      return {
        inputs: [
          {
            eventType: eventType as (typeof mediaEventTypes)[number],
            resourceUid: data.uid,
            status: data.status || 'completed',
            mediaUrl,
            mediaUrlPng,
            pdfUrl,
            templateUid,
            metadata: data.metadata || null,
            createdAt: data.created_at || new Date().toISOString()
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let mediaType = ctx.input.eventType.replace('_created', '');

      return {
        type: `${mediaType}.created`,
        id: `${ctx.input.eventType}_${ctx.input.resourceUid}`,
        output: {
          resourceUid: ctx.input.resourceUid,
          mediaType,
          status: ctx.input.status,
          mediaUrl: ctx.input.mediaUrl,
          mediaUrlPng: ctx.input.mediaUrlPng,
          pdfUrl: ctx.input.pdfUrl,
          templateUid: ctx.input.templateUid,
          metadata: ctx.input.metadata,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
