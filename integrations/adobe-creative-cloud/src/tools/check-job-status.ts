import { createAxios, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let checkJobStatus = SlateTool.create(spec, {
  name: 'Check Job Status',
  key: 'check_job_status',
  description: `Check the status of an asynchronous Photoshop, Lightroom, or InDesign API job by polling its status URL. Returns the current job status, any output URLs, and error information if the job failed.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      statusUrl: z
        .string()
        .describe(
          'Status URL returned from a previous Photoshop, Lightroom, or InDesign API call'
        )
    })
  )
  .output(
    z.object({
      status: z
        .string()
        .describe('Current job status (e.g. pending, running, succeeded, failed)'),
      outputs: z
        .array(
          z.object({
            href: z.string().optional().describe('Output file URL'),
            storage: z.string().optional().describe('Storage type'),
            status: z.string().optional().describe('Individual output status')
          })
        )
        .optional()
        .describe('Output file locations'),
      errors: z.any().optional().describe('Error details if the job failed')
    })
  )
  .handleInvocation(async ctx => {
    let http = createAxios({});
    let response = await http.get(ctx.input.statusUrl, {
      headers: {
        Authorization: `Bearer ${ctx.auth.token}`,
        'x-api-key': ctx.auth.clientId
      }
    });

    let data = response.data;

    let outputs = (data.outputs || data.output || []).map((o: any) => ({
      href: o.href || o._links?.self?.href,
      storage: o.storage,
      status: o.status
    }));

    return {
      output: {
        status: data.status || data.jobStatus || 'unknown',
        outputs: outputs.length > 0 ? outputs : undefined,
        errors: data.errors || data.error
      },
      message: `Job status: **${data.status || data.jobStatus || 'unknown'}**. ${outputs.length > 0 ? `${outputs.length} output(s) available.` : ''}`
    };
  })
  .build();
