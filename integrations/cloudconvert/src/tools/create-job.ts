import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createJob = SlateTool.create(spec, {
  name: 'Create Custom Job',
  key: 'create_job',
  description: `Create a custom CloudConvert job with a flexible task pipeline. Use this for advanced workflows that combine multiple operations like converting, watermarking, thumbnailing, and exporting in a single job.

Each task is defined as a key-value pair where the key is a task name and the value is the task configuration. Tasks can reference each other's outputs to form a processing pipeline.`,
  instructions: [
    'Define tasks as a record where keys are task names and values are task configs.',
    'Each task config must include an "operation" field (e.g., "import/url", "convert", "export/url").',
    'Tasks reference other tasks via the "input" array field using task names.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      tasks: z
        .record(z.string(), z.any())
        .describe(
          'Task definitions as a name-to-config map. Each task must include an "operation" field.'
        ),
      tag: z.string().optional().describe('Tag to label the job'),
      webhookUrl: z
        .string()
        .optional()
        .describe('Webhook URL to receive job status notifications'),
      webhookEvents: z
        .array(z.string())
        .optional()
        .describe('Webhook events to subscribe to (e.g., "job.finished", "job.failed")'),
      waitForCompletion: z
        .boolean()
        .optional()
        .default(false)
        .describe('Wait for the job to finish before returning')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('ID of the created job'),
      status: z.string().describe('Job status'),
      tasks: z
        .array(
          z.object({
            taskId: z.string().describe('ID of the task'),
            taskName: z
              .string()
              .optional()
              .describe('Name of the task as defined in the input'),
            operation: z.string().describe('Task operation type'),
            status: z.string().describe('Task status'),
            resultFiles: z
              .array(
                z.object({
                  url: z.string().optional().describe('Download URL'),
                  filename: z.string().describe('Filename')
                })
              )
              .optional()
              .describe('Output files')
          })
        )
        .describe('Tasks in the job')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let job = await client.createJob(
      ctx.input.tasks,
      ctx.input.tag,
      ctx.input.webhookUrl,
      ctx.input.webhookEvents
    );

    if (ctx.input.waitForCompletion) {
      job = await client.waitForJob(job.id);
    }

    let tasks = (job.tasks ?? []).map((t: any) => ({
      taskId: t.id,
      taskName: t.name,
      operation: t.operation,
      status: t.status,
      resultFiles: t.result?.files?.map((f: any) => ({
        url: f.url,
        filename: f.filename
      }))
    }));

    return {
      output: {
        jobId: job.id,
        status: job.status,
        tasks
      },
      message: `Job **${job.id}** created with ${tasks.length} task(s). Status: **${job.status}**.`
    };
  })
  .build();
