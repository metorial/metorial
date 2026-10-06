import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  authorization,
  baseUrl,
  id,
  integer,
  invalid,
  pathId,
  row,
  text
} from '../lib/contracts';
import { spec } from '../spec';
export const downloadFileTool = SlateTool.create(spec, {
  key: 'download_file',
  name: 'Download File',
  description:
    'Prepare one opportunity resume or uploaded file for download. Discover its ID with get_opportunity_activity using resumes or files.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      opportunityId: z
        .string()
        .describe('Exact opportunity ID; discover it with list_opportunities'),
      kind: z.enum(['file', 'resume']),
      fileId: z
        .string()
        .describe('Exact file or resume ID returned by get_opportunity_activity')
    })
  )
  .output(
    z.object({
      fileId: z.string(),
      opportunityId: z.string(),
      kind: z.enum(['file', 'resume']),
      name: z.string(),
      size: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    const opportunityId = id(ctx.input.opportunityId);
    const fileId = id(ctx.input.fileId);
    const kind = ctx.input.kind === 'file' ? 'files' : 'resumes';
    const record = (await new Client(ctx.auth).getFile(opportunityId, fileId, kind)).data;
    const file = ctx.input.kind === 'file' ? record : row(record.file);
    if (
      file.status === 'processing' ||
      file.status === 'unsupported' ||
      file.status === 'error'
    )
      invalid(
        'This file is still processing or cannot be downloaded. Check its processing state in Lever.'
      );
    // Resumes without a native file do not have downloadable bytes.
    text(file.downloadUrl, 'Provider file download reference');
    const name = text(file.name, 'Returned file name');
    const size =
      file.size === undefined ? undefined : integer(file.size, 'Returned file size', 0);
    await ctx.addAttachment({
      type: 'url',
      url: `${baseUrl(ctx.auth)}/opportunities/${pathId(opportunityId)}/${kind}/${pathId(fileId)}/download`,
      filename: name,
      headers: { Authorization: authorization(ctx.auth) }
    });
    return {
      output: { opportunityId, fileId, kind: ctx.input.kind, name, size },
      message: `Prepared ${name} for download.`
    };
  })
  .build();
