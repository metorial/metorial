import { getFileUrlTool, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { prepareFile, referenceSchema } from '../lib/files';
import { fail } from '../lib/validation';
import { spec } from '../spec';

export const downloadJobFile = SlateTool.create(spec, {
  key: 'download_job_file',
  name: 'Download Job File',
  description:
    'Download one exact current job file or the job’s current diagnostic ZIP archive. Discover file IDs with get_job.',
  instructions: [
    'Files may be purged or unavailable before generation. Diagnostics are the current archive and do not identify a historical snapshot. Signed links expire at their native timestamp; renewal rechecks the exact job and file reference.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      jobId: z.string().describe('Native job ID.'),
      kind: z.enum(['file', 'diagnostics']).default('file'),
      fileId: z
        .string()
        .optional()
        .describe('Exact id from the job’s files array; required for kind=file.')
    })
  )
  .output(
    z.object({
      jobId: z.string(),
      fileId: z.string().optional(),
      kind: z.enum(['file', 'diagnostics']),
      fileName: z.string(),
      mimeType: z.string(),
      expiresAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    const details = await prepareFile(new Client(ctx.auth, ctx.config), ctx.input);
    await ctx.addAttachment({
      type: 'url',
      url: details.url,
      mimeType: details.mimeType,
      filename: details.filename,
      refreshReference: details.reference,
      refreshAt: details.expiresAt
    });
    return {
      output: {
        jobId: details.reference.jobId,
        fileId: ctx.input.fileId,
        kind: ctx.input.kind,
        fileName: details.filename,
        mimeType: details.mimeType,
        expiresAt: details.expiresAt
      },
      message: 'Prepared the current exact job artifact for download.'
    };
  })
  .build();
export const getFileUrl = getFileUrlTool(spec, async ctx => {
  const parsed = referenceSchema.safeParse(ctx.input.reference);
  if (!parsed.success) throw fail('Invalid file reference. Request the file again.');
  const old = signedUrlForRenewal(ctx.input.url);
  const ref = parsed.data;
  if (old.origin !== ref.origin || old.path !== ref.path)
    throw fail('The old file URL does not match its native reference.');
  const client = new Client(ctx.auth, ctx.config);
  if (client.region !== ref.region) throw fail('The file belongs to another Celigo region.');
  const next = await prepareFile(client, ref);
  if (
    next.reference.ownerId !== ref.ownerId ||
    next.reference.binding !== ref.binding ||
    next.origin !== ref.origin ||
    (ref.kind === 'file' && next.path !== ref.path)
  )
    throw fail('The original job/file identity changed. Request the file again.');
  return { url: next.url, expiresAt: next.expiresAt, headers: {}, query: {} };
});
function signedUrlForRenewal(value: string) {
  // The original URL is expected to have expired; validate the host/path without imposing its old expiry.
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw fail('Invalid old file URL.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    url.hash ||
    !(
      url.hostname === 's3.amazonaws.com' ||
      /^[a-z\d][a-z\d.-]*\.s3(?:[.-][a-z\d-]+)?\.amazonaws\.com$/.test(url.hostname)
    )
  )
    throw fail('Unsupported old file host.');
  return { origin: url.origin, path: url.pathname };
}
