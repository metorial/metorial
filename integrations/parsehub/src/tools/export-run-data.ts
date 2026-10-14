import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let exportRunData = SlateTool.create(spec, {
  name: 'Export Run Data',
  key: 'export_run_data',
  description:
    'Prepare a downloadable JSON or CSV file containing the extracted data from a ParseHub run. Discover run tokens with get_project or run_project.',
  constraints: [
    'Checks run readiness using get_run, which is subject to per-run polling limits.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      runToken: z.string().min(1).describe('Run token from get_project or run_project'),
      format: z.enum(['json', 'csv']).optional().describe('Download format; defaults to json')
    })
  )
  .output(
    z.object({
      runToken: z.string().describe('Token of the exported run'),
      projectToken: z.string().describe('Token of the project the run belongs to'),
      format: z.enum(['json', 'csv']).describe('Format of the downloadable file'),
      mimeType: z.string().describe('MIME type of the downloadable file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let run = await client.getRun(ctx.input.runToken);
    if (!run.data_ready) {
      throw createApiServiceError(
        'This run has no data available yet. Wait until dataReady is 1.'
      );
    }

    let format = ctx.input.format ?? 'json';
    let mimeType = format === 'csv' ? 'text/csv' : 'application/json';
    await ctx.addAttachment({
      type: 'url',
      url: `https://www.parsehub.com/api/v2/runs/${encodeURIComponent(run.run_token)}/data`,
      query: { api_key: ctx.auth.token, format },
      mimeType
    });
    return {
      output: {
        runToken: run.run_token,
        projectToken: run.project_token,
        format,
        mimeType
      },
      message: `Prepared a ${format.toUpperCase()} download for run **${run.run_token}**.`
    };
  })
  .build();
