import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let taskSchema = z.object({
  taskId: z.string().describe('ID of the task'),
  operation: z.string().describe('Task operation type'),
  status: z.string().describe('Task status'),
  message: z.string().optional().describe('Task status message or error message'),
  progress: z.number().optional().describe('Task progress percentage (0-100)'),
  createdAt: z.string().optional().describe('Task creation timestamp'),
  endedAt: z.string().optional().describe('Task completion timestamp'),
  resultFiles: z
    .array(
      z.object({
        url: z.string().optional().describe('Temporary download URL'),
        filename: z.string().describe('Filename of the result')
      })
    )
    .optional()
    .describe('Output files produced by the task')
});

export let getJob = SlateTool.create(spec, {
  name: 'Get Job',
  key: 'get_job',
  description: `Retrieve the details and status of a CloudConvert job including all its tasks and results.

Use this to check the progress of an ongoing job or to retrieve download URLs for completed jobs. Can also wait for a job to complete.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('ID of the job to retrieve'),
      waitForCompletion: z
        .boolean()
        .optional()
        .default(false)
        .describe('Wait for the job to finish before returning')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('ID of the job'),
      status: z.string().describe('Job status (waiting, processing, finished, error)'),
      tag: z.string().optional().describe('Job tag'),
      createdAt: z.string().optional().describe('Job creation timestamp'),
      endedAt: z.string().optional().describe('Job completion timestamp'),
      tasks: z.array(taskSchema).describe('Tasks within the job')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let job: any;
    if (ctx.input.waitForCompletion) {
      job = await client.waitForJob(ctx.input.jobId);
    } else {
      job = await client.getJob(ctx.input.jobId);
    }

    let tasks = (job.tasks ?? []).map((t: any) => ({
      taskId: t.id,
      operation: t.operation,
      status: t.status,
      message: t.message,
      progress: t.percent,
      createdAt: t.created_at,
      endedAt: t.ended_at,
      resultFiles: t.result?.files?.map((f: any) => ({
        url: f.url,
        filename: f.filename
      }))
    }));

    return {
      output: {
        jobId: job.id,
        status: job.status,
        tag: job.tag,
        createdAt: job.created_at,
        endedAt: job.ended_at,
        tasks
      },
      message: `Job **${job.id}** is **${job.status}**. Contains ${tasks.length} task(s).`
    };
  })
  .build();
