import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getJobStatus = SlateTool.create(spec, {
  name: 'Get Job Status',
  key: 'get_job_status',
  description: `Check the status and retrieve results of an async processing job. Supports image editing, AI fashion model, and video generation jobs.

Returns the current status, any errors, and the result data when the job is complete.`,
  instructions: [
    'Specify the jobType matching the original request: "image_edit", "fashion_model", or "video".'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      jobType: z
        .enum(['image_edit', 'fashion_model', 'video'])
        .describe('Type of async job to check'),
      taskId: z.number().describe('Task ID returned from the original async request')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('Task ID'),
      status: z
        .string()
        .describe(
          'Current status: ACCEPTED, WAITING, PROCESSING, DONE, ERROR, CANCELLED, or PAUSED'
        ),
      createdAt: z.string().optional().describe('Task creation timestamp'),
      errors: z
        .array(
          z.object({
            error: z.string(),
            createdAt: z.string().optional()
          })
        )
        .optional()
        .describe('Any errors encountered during processing'),
      result: z
        .object({
          inputObjects: z
            .array(z.record(z.string(), z.unknown()))
            .optional()
            .describe('Input file metadata'),
          outputObjects: z
            .array(
              z.object({
                format: z.string().optional(),
                width: z.number().optional(),
                height: z.number().optional(),
                temporaryUrl: z.string().optional(),
                storageUri: z.string().optional(),
                mimeType: z.string().optional()
              })
            )
            .optional()
            .describe('Output file metadata and URLs'),
          generatedPrompt: z.string().optional().describe('Auto-generated prompt (for video)')
        })
        .optional()
        .describe('Job result (available when status is DONE)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: any;

    ctx.info(`Checking ${ctx.input.jobType} job status for task ${ctx.input.taskId}`);

    if (ctx.input.jobType === 'image_edit') {
      let result = await client.getAsyncEditStatus(ctx.input.taskId);
      data = result.data;
    } else if (ctx.input.jobType === 'fashion_model') {
      let result = await client.getFashionModelStatus(ctx.input.taskId);
      data = result.data;
    } else {
      let result = await client.getVideoStatus(ctx.input.taskId);
      data = result.data;
    }

    let errors = (data.errors || []).map((e: any) => ({
      error: e.error,
      createdAt: e.created_at
    }));

    let resultOutput: Record<string, unknown> | undefined;

    if (data.result) {
      let r = data.result;

      let inputObjects = r.input_objects || (r.input_object ? [r.input_object] : undefined);
      let rawOutputs = r.output_objects || (r.output_object ? [r.output_object] : undefined);

      let outputObjects = rawOutputs?.map((o: any) => ({
        format: o.format || o.ext,
        width: o.width,
        height: o.height,
        temporaryUrl: o.tmp_url,
        storageUri: o.claid_storage_uri,
        mimeType: o.mime
      }));

      resultOutput = {
        inputObjects,
        outputObjects,
        generatedPrompt: r.input_object?.generated_prompt
      };
    }

    let statusEmoji = data.status === 'DONE' ? '✅' : data.status === 'ERROR' ? '❌' : '⏳';

    return {
      output: {
        taskId: data.id,
        status: data.status,
        createdAt: data.created_at,
        errors: errors.length > 0 ? errors : undefined,
        result: resultOutput as any
      },
      message: `${statusEmoji} Job **${data.id}** status: **${data.status}**. ${data.status === 'DONE' && resultOutput ? 'Results are ready.' : ''}`
    };
  })
  .build();
