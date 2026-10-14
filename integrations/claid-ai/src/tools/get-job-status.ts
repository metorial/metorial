import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { addResultFiles, jobOutputSchema, mapJob } from '../lib/responses';
import { spec } from '../spec';

export let getJobStatus = SlateTool.create(spec, {
  name: 'Get Job Status',
  key: 'get_job_status',
  description: `Check the status and retrieve results of an async processing job. Supports image editing, AI fashion model, and video generation jobs.

Returns the current status, any errors, and downloadable results when the job is complete.`,
  instructions: [
    'Specify the jobType matching the original request: "image_edit", "fashion_model", or "video".',
    'Temporary results are available for 24 hours. Use a connected storage destination for persistent results.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      jobType: z
        .enum(['image_edit', 'fashion_model', 'video'])
        .describe('Type of async job to check'),
      taskId: z.number().describe('Task ID returned from the original async request')
    })
  )
  .output(jobOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    ctx.info(`Checking ${ctx.input.jobType} job status for task ${ctx.input.taskId}`);
    let response =
      ctx.input.jobType === 'image_edit'
        ? await client.getAsyncEditStatus(ctx.input.taskId)
        : ctx.input.jobType === 'fashion_model'
          ? await client.getFashionModelStatus(ctx.input.taskId)
          : await client.getVideoStatus(ctx.input.taskId);
    let data = response.data;
    let result = data.result;
    if (result) {
      await addResultFiles(
        ctx,
        result.output_objects ?? (result.output_object ? [result.output_object] : [])
      );
    }
    return {
      output: mapJob(data),
      message: `Job **${data.id}** status: **${data.status}**. ${data.status === 'DONE' ? 'Results are ready.' : ''}`
    };
  })
  .build();
