import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, identifier } from '../lib/client';
import { spec } from '../spec';
export const resultFileUrl = (orgFolder: unknown, agentFolder: unknown, filename: string) => {
  const segment = (value: unknown) => {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value))
      throw createApiServiceError(
        'PhantomBuster did not return valid result storage paths. Run the Phantom successfully before requesting its result file.',
        { reason: 'invalid_response' }
      );
    return encodeURIComponent(value);
  };
  if (!/^[A-Za-z0-9][A-Za-z0-9._ -]*\.(?:csv|json)$/.test(filename) || filename.includes('..'))
    throw createApiServiceError(
      'Choose a CSV or JSON filename without folders, URL parameters or traversal segments.'
    );
  return `https://phantombuster.s3.amazonaws.com/${segment(orgFolder)}/${segment(agentFolder)}/${encodeURIComponent(filename)}`;
};
export const downloadResults = SlateTool.create(spec, {
  name: 'Download Results',
  key: 'download_results',
  description:
    'Prepare an accumulated Phantom result file as a downloadable CSV or JSON. These files combine results across launches, rather than one container. The Phantom must already have produced the requested file. Use Get Execution for launch-specific result data.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      phantomId: z.string().describe('Phantom ID from List Phantoms'),
      format: z
        .enum(['csv', 'json'])
        .optional()
        .describe('Default filename format; defaults to CSV.'),
      filename: z
        .string()
        .optional()
        .describe(
          'Actual custom .csv or .json result filename, if configured. Defaults to result.csv or result.json.'
        )
    })
  )
  .output(z.object({ phantomId: z.string(), filename: z.string(), mimeType: z.string() }))
  .handleInvocation(async ctx => {
    const id = identifier(ctx.input.phantomId, 'Phantom ID');
    const agent = await new Client({ token: ctx.auth.token }).fetchAgent(id);
    const filename = ctx.input.filename ?? `result.${ctx.input.format ?? 'csv'}`;
    if (filename.includes(ctx.auth.token))
      throw createApiServiceError(
        'The result filename cannot contain an authentication secret.'
      );
    if (ctx.input.format && !filename.endsWith(`.${ctx.input.format}`))
      throw createApiServiceError('The filename extension must match the requested format.');
    const url = resultFileUrl(agent.orgS3Folder, agent.s3Folder, filename);
    const mimeType = filename.endsWith('.csv') ? 'text/csv' : 'application/json';
    await ctx.addAttachment({ type: 'url', url, mimeType });
    return {
      output: { phantomId: id, filename, mimeType },
      message: `Prepared **${filename}** for download. The provider must retain that result file.`
    };
  })
  .build();
