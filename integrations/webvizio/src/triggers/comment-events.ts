import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let commentEventTypes = ['comment.created', 'comment.deleted'] as const;

export let commentEvents = SlateTrigger.create(spec, {
  name: 'Comment Events',
  key: 'comment_events',
  description:
    'Triggers when a comment is created or deleted on a task in Webvizio. Events are only fired when initiated by a user within the Webvizio interface.'
})
  .input(
    z.object({
      eventType: z.enum(commentEventTypes).describe('Type of comment event'),
      comment: z
        .object({
          id: z.number(),
          externalId: z.string().nullable(),
          taskId: z.number(),
          taskExternalId: z.string().nullable(),
          author: z.string(),
          body: z.string(),
          bodyHtml: z.string().nullable(),
          createdAt: z.string()
        })
        .describe('Comment data from the webhook payload')
    })
  )
  .output(
    z.object({
      commentId: z.number().describe('Webvizio comment ID'),
      externalId: z.string().nullable().describe('External identifier'),
      taskId: z.number().describe('Parent task ID'),
      taskExternalId: z.string().nullable().describe('Parent task external ID'),
      author: z.string().describe('Comment author email'),
      body: z.string().describe('Comment text'),
      bodyHtml: z.string().nullable().describe('Comment text in HTML format'),
      createdAt: z.string().describe('Creation timestamp in ISO8601 format')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let registrations: { event: string; webhookId: number }[] = [];

      for (let event of commentEventTypes) {
        let result = await client.subscribeWebhook({
          url: `${ctx.input.webhookBaseUrl}/${event}`,
          event
        });
        registrations.push({ event, webhookId: result.id });
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        registrations: { event: string; webhookId: number }[];
      };

      for (let reg of details.registrations) {
        try {
          await client.unsubscribeWebhook(reg.webhookId);
        } catch (_err) {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let comment = data as unknown as {
        id: number;
        externalId: string | null;
        taskId: number;
        taskExternalId: string | null;
        author: string;
        body: string;
        bodyHtml: string | null;
        createdAt: string;
      };

      // Determine event type from the URL subpath
      let requestUrl = ctx.request.url;
      let eventType: (typeof commentEventTypes)[number] = 'comment.created';
      for (let evt of commentEventTypes) {
        if (requestUrl.endsWith(`/${evt}`)) {
          eventType = evt;
          break;
        }
      }

      return {
        inputs: [
          {
            eventType,
            comment: {
              id: comment.id,
              externalId: comment.externalId ?? null,
              taskId: comment.taskId,
              taskExternalId: comment.taskExternalId ?? null,
              author: comment.author ?? '',
              body: comment.body ?? '',
              bodyHtml: comment.bodyHtml ?? null,
              createdAt: comment.createdAt
            }
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let comment = ctx.input.comment;

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${comment.id}-${comment.createdAt}`,
        output: {
          commentId: comment.id,
          externalId: comment.externalId,
          taskId: comment.taskId,
          taskExternalId: comment.taskExternalId,
          author: comment.author,
          body: comment.body,
          bodyHtml: comment.bodyHtml,
          createdAt: comment.createdAt
        }
      };
    }
  })
  .build();
