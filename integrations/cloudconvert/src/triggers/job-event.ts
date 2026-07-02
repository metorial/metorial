import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let taskSchema = z.object({
  taskId: z.string().describe('ID of the task'),
  taskName: z.string().optional().describe('Name of the task'),
  operation: z.string().describe('Task operation type'),
  status: z.string().describe('Task status'),
  message: z.string().optional().describe('Task message or error'),
  resultFiles: z
    .array(
      z.object({
        url: z.string().optional().describe('Download URL'),
        filename: z.string().describe('Filename')
      })
    )
    .optional()
    .describe('Output files produced by the task')
});

export let jobEvent = SlateTrigger.create(spec, {
  name: 'Job Event',
  key: 'job_event',
  description:
    'Triggers when a CloudConvert job is created, updated, finished, or fails. Receive webhook notifications for job lifecycle events.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of job event'),
      jobId: z.string().describe('ID of the job'),
      tag: z.string().optional().describe('Tag of the job'),
      jobStatus: z.string().describe('Job status'),
      tasks: z
        .array(
          z.object({
            taskId: z.string(),
            taskName: z.string().optional(),
            operation: z.string(),
            status: z.string(),
            message: z.string().optional(),
            resultFiles: z
              .array(
                z.object({
                  url: z.string().optional(),
                  filename: z.string()
                })
              )
              .optional()
          })
        )
        .describe('Tasks in the job')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('ID of the job'),
      jobStatus: z.string().describe('Job status (waiting, processing, finished, error)'),
      tag: z.string().optional().describe('Job tag'),
      createdAt: z.string().optional().describe('Job creation timestamp'),
      endedAt: z.string().optional().describe('Job completion timestamp'),
      tasks: z.array(taskSchema).describe('Tasks within the job')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        environment: ctx.config.environment
      });

      let webhook = await client.createWebhook(ctx.input.webhookBaseUrl, [
        'job.created',
        'job.updated',
        'job.finished',
        'job.failed'
      ]);

      return {
        registrationDetails: {
          webhookId: webhook.id,
          signingSecret: webhook.signing_secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        environment: ctx.config.environment
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let event = body.event;
      let job = body.job;

      if (!event || !job) {
        return { inputs: [] };
      }

      let tasks = (job.tasks ?? []).map((t: any) => ({
        taskId: t.id,
        taskName: t.name,
        operation: t.operation,
        status: t.status,
        message: t.message,
        resultFiles: t.result?.files?.map((f: any) => ({
          url: f.url,
          filename: f.filename
        }))
      }));

      return {
        inputs: [
          {
            eventType: event,
            jobId: job.id,
            tag: job.tag,
            jobStatus: job.status,
            tasks
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: `${ctx.input.jobId}-${ctx.input.eventType}`,
        output: {
          jobId: ctx.input.jobId,
          jobStatus: ctx.input.jobStatus,
          tag: ctx.input.tag,
          tasks: ctx.input.tasks.map(t => ({
            taskId: t.taskId,
            taskName: t.taskName,
            operation: t.operation,
            status: t.status,
            message: t.message,
            resultFiles: t.resultFiles
          }))
        }
      };
    }
  })
  .build();
