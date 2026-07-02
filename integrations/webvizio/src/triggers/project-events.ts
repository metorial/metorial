import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let projectEventTypes = ['project.created', 'project.updated', 'project.deleted'] as const;

export let projectEvents = SlateTrigger.create(spec, {
  name: 'Project Events',
  key: 'project_events',
  description:
    'Triggers when a project is created, updated, or deleted in Webvizio. Events are only fired when initiated by a user within the Webvizio interface.'
})
  .input(
    z.object({
      eventType: z.enum(projectEventTypes).describe('Type of project event'),
      project: z
        .object({
          id: z.number(),
          uuid: z.string(),
          externalId: z.string().nullable(),
          name: z.string(),
          screenshot: z.string().nullable(),
          url: z.string().nullable(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
        .describe('Project data from the webhook payload')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Webvizio project ID'),
      uuid: z.string().describe('Project UUID'),
      externalId: z.string().nullable().describe('External identifier'),
      name: z.string().describe('Project name'),
      screenshot: z.string().nullable().describe('Project screenshot URL'),
      url: z.string().nullable().describe('Project website URL'),
      createdAt: z.string().describe('Creation timestamp in ISO8601 format'),
      updatedAt: z.string().describe('Last update timestamp in ISO8601 format')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let registrations: { event: string; webhookId: number }[] = [];

      for (let event of projectEventTypes) {
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
          // Ignore errors during cleanup — webhook may already be removed
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let project = data as unknown as {
        id: number;
        uuid: string;
        externalId: string | null;
        name: string;
        screenshot: string | null;
        url: string | null;
        createdAt: string;
        updatedAt: string;
      };

      // Determine event type from the URL subpath
      let requestUrl = ctx.request.url;
      let eventType: (typeof projectEventTypes)[number] = 'project.updated';
      for (let evt of projectEventTypes) {
        if (requestUrl.endsWith(`/${evt}`)) {
          eventType = evt;
          break;
        }
      }

      return {
        inputs: [
          {
            eventType,
            project: {
              id: project.id,
              uuid: project.uuid,
              externalId: project.externalId ?? null,
              name: project.name,
              screenshot: project.screenshot ?? null,
              url: project.url ?? null,
              createdAt: project.createdAt,
              updatedAt: project.updatedAt
            }
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${ctx.input.project.id}-${ctx.input.project.updatedAt}`,
        output: {
          projectId: ctx.input.project.id,
          uuid: ctx.input.project.uuid,
          externalId: ctx.input.project.externalId,
          name: ctx.input.project.name,
          screenshot: ctx.input.project.screenshot,
          url: ctx.input.project.url,
          createdAt: ctx.input.project.createdAt,
          updatedAt: ctx.input.project.updatedAt
        }
      };
    }
  })
  .build();
