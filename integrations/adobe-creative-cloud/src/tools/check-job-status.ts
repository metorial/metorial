import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { createAdobeAxios, getAdobeJobUrl } from '../lib/client';
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
        .optional()
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
      errors: z.any().optional().describe('Error details if the job failed'),
      raw: z
        .any()
        .optional()
        .describe('Complete Adobe job response, including manifests and per-output metadata')
    })
  )
  .handleInvocation(async ctx => {
    let url = getAdobeJobUrl(ctx.input.statusUrl);
    let http = createAdobeAxios(url.origin, ctx.auth);
    let response = await http.get(`${url.pathname}${url.search}`, { maxRedirects: 0 });

    let data = response.data;
    if (!isApiErrorRecord(data)) {
      throw createApiServiceError('Adobe returned an invalid job status response.');
    }

    let result = isApiErrorRecord(data.result) ? data.result : undefined;
    let rawOutputs = data.outputs ?? data.output ?? result?.outputs;
    let providerOutputs = Array.isArray(rawOutputs)
      ? rawOutputs
      : isApiErrorRecord(rawOutputs)
        ? [rawOutputs]
        : [];
    let statuses = [
      ...new Set(
        providerOutputs
          .map((output: any) => output.status)
          .filter((status: unknown) => typeof status === 'string')
      )
    ];
    let status =
      data.status ?? data.jobStatus ?? (statuses.length === 1 ? statuses[0] : undefined);
    let outputs = providerOutputs.flatMap((output: any) => {
      let renditions = output._links?.renditions;
      let files = Array.isArray(renditions) ? renditions : [output];
      return files.map((file: any) => ({
        href: file.href ?? file._links?.self?.href ?? file.destination?.url ?? file.url,
        storage: file.storage,
        status: output.status ?? status
      }));
    });
    for (let output of providerOutputs) {
      if (output.status !== 'succeeded' || !Array.isArray(output._links?.renditions)) continue;
      for (let file of output._links.renditions) {
        if (typeof file.href === 'string') {
          await ctx.addAttachment({ type: 'url', url: file.href, mimeType: file.type });
        }
      }
    }
    let outputErrors = providerOutputs
      .map((output: any) => output.errors ?? output.error)
      .filter((error: unknown) => error !== undefined);

    return {
      output: {
        status: typeof status === 'string' ? status : undefined,
        outputs: outputs.length > 0 ? outputs : undefined,
        errors:
          data.errors ??
          data.error ??
          data.errorDetails ??
          (outputErrors.length ? outputErrors : undefined),
        raw: data
      },
      message:
        typeof status === 'string'
          ? `Job status: **${status}**.`
          : 'Retrieved job status details for each output.'
    };
  })
  .build();
