import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let taskEventTypes = ['task.created', 'task.updated', 'task.deleted'] as const;

export let taskEvents = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description:
    'Triggers when a task is created, updated, or deleted in Webvizio. Events are only fired when initiated by a user within the Webvizio interface.'
})
  .input(
    z.object({
      eventType: z.enum(taskEventTypes).describe('Type of task event'),
      task: z
        .object({
          id: z.number(),
          externalId: z.string().nullable(),
          number: z.number(),
          projectId: z.number(),
          projectUuid: z.string(),
          projectExternalId: z.string().nullable(),
          author: z.string(),
          name: z.string(),
          description: z.string(),
          descriptionHtml: z.string().nullable(),
          screenshot: z.string().nullable(),
          status: z.string(),
          priority: z.string(),
          deviceType: z.string(),
          os: z.string(),
          browser: z.string(),
          executeAt: z.string(),
          createdAt: z.string(),
          updatedAt: z.string(),
          tags: z.array(z.string()),
          files: z.array(
            z.object({
              fileName: z.string(),
              fileUrl: z.string()
            })
          ),
          videos: z.array(z.string()),
          assignees: z.array(z.string()),
          timeLogs: z.array(
            z.object({
              id: z.number(),
              user: z.string(),
              date: z.string(),
              time: z.number()
            })
          )
        })
        .describe('Task data from the webhook payload')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('Webvizio task ID'),
      externalId: z.string().nullable().describe('External identifier'),
      taskNumber: z.number().describe('Task sequence number'),
      projectId: z.number().describe('Parent project ID'),
      projectUuid: z.string().describe('Parent project UUID'),
      projectExternalId: z.string().nullable().describe('Parent project external ID'),
      author: z.string().describe('Task author email'),
      name: z.string().describe('Task title'),
      description: z.string().describe('Task description'),
      descriptionHtml: z.string().nullable().describe('Task description in HTML'),
      screenshot: z.string().nullable().describe('Annotated screenshot URL'),
      status: z.string().describe('Task status'),
      priority: z.string().describe('Task priority'),
      deviceType: z.string().describe('Device type'),
      os: z.string().describe('Operating system'),
      browser: z.string().describe('Browser'),
      dueDate: z.string().describe('Due date in ISO8601 format'),
      tags: z.array(z.string()).describe('Task tags'),
      assignees: z.array(z.string()).describe('Assigned user emails'),
      files: z
        .array(
          z.object({
            fileName: z.string().describe('File name'),
            fileUrl: z.string().describe('File URL')
          })
        )
        .describe('Attached files'),
      videos: z.array(z.string()).describe('Attached video URLs'),
      timeLogs: z
        .array(
          z.object({
            timeLogId: z.number().describe('Time log ID'),
            user: z.string().describe('User email'),
            date: z.string().describe('Date'),
            time: z.number().describe('Duration in minutes')
          })
        )
        .describe('Time log entries'),
      createdAt: z.string().describe('Creation timestamp in ISO8601 format'),
      updatedAt: z.string().describe('Last update timestamp in ISO8601 format')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let registrations: { event: string; webhookId: number }[] = [];

      for (let event of taskEventTypes) {
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

      let task = data as unknown as {
        id: number;
        externalId: string | null;
        number: number;
        projectId: number;
        projectUuid: string;
        projectExternalId: string | null;
        author: string;
        name: string;
        description: string;
        descriptionHtml: string | null;
        screenshot: string | null;
        status: string;
        priority: string;
        deviceType: string;
        os: string;
        browser: string;
        executeAt: string;
        createdAt: string;
        updatedAt: string;
        tags: string[];
        files: { fileName: string; fileUrl: string }[];
        videos: string[];
        assignees: string[];
        timeLogs: { id: number; user: string; date: string; time: number }[];
      };

      // Determine event type from the URL subpath
      let requestUrl = ctx.request.url;
      let eventType: (typeof taskEventTypes)[number] = 'task.updated';
      for (let evt of taskEventTypes) {
        if (requestUrl.endsWith(`/${evt}`)) {
          eventType = evt;
          break;
        }
      }

      return {
        inputs: [
          {
            eventType,
            task: {
              id: task.id,
              externalId: task.externalId ?? null,
              number: task.number,
              projectId: task.projectId,
              projectUuid: task.projectUuid,
              projectExternalId: task.projectExternalId ?? null,
              author: task.author,
              name: task.name,
              description: task.description,
              descriptionHtml: task.descriptionHtml ?? null,
              screenshot: task.screenshot ?? null,
              status: task.status,
              priority: task.priority,
              deviceType: task.deviceType,
              os: task.os,
              browser: task.browser,
              executeAt: task.executeAt,
              createdAt: task.createdAt,
              updatedAt: task.updatedAt,
              tags: task.tags ?? [],
              files: task.files ?? [],
              videos: task.videos ?? [],
              assignees: task.assignees ?? [],
              timeLogs: task.timeLogs ?? []
            }
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let task = ctx.input.task;

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${task.id}-${task.updatedAt}`,
        output: {
          taskId: task.id,
          externalId: task.externalId,
          taskNumber: task.number,
          projectId: task.projectId,
          projectUuid: task.projectUuid,
          projectExternalId: task.projectExternalId,
          author: task.author,
          name: task.name,
          description: task.description,
          descriptionHtml: task.descriptionHtml,
          screenshot: task.screenshot,
          status: task.status,
          priority: task.priority,
          deviceType: task.deviceType,
          os: task.os,
          browser: task.browser,
          dueDate: task.executeAt,
          tags: task.tags,
          assignees: task.assignees,
          files: task.files,
          videos: task.videos,
          timeLogs: task.timeLogs.map(tl => ({
            timeLogId: tl.id,
            user: tl.user,
            date: tl.date,
            time: tl.time
          })),
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        }
      };
    }
  })
  .build();
