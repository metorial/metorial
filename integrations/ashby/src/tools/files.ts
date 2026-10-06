import { getFileUrlTool, SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import {
  invalid,
  row,
  safeData,
  str,
  text,
  unexpected,
  warningsSchema
} from '../lib/contracts';
import { spec } from '../spec';

const reference = z.object({ fileHandle: z.string() }).strict();
const downloadDetails = async (client: AshbyClient, handle: string) => {
  const fileHandle = text(handle, 'File handle');
  if (fileHandle.length > 16_384 || /\s/.test(fileHandle))
    invalid('Use the exact nonempty file handle returned by the candidate or offer API.');
  const url = str(row((await client.post('/file.info', { fileHandle })).results).url);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return unexpected();
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.hash ||
    !(parsed.hostname === 's3.amazonaws.com' || parsed.hostname.endsWith('.amazonaws.com'))
  )
    unexpected();
  // The provider does not return URL expiry. Renew before every download instead of assuming a lifetime.
  return { url, expiresAt: new Date().toISOString(), fileHandle };
};
export const downloadFile = SlateTool.create(spec, {
  key: 'download_file',
  name: 'Download Candidate or Offer File',
  description:
    'Prepares a downloadable candidate file, resume or offer document using its exact provider file handle. Requires candidatesRead. Ashby-generated demo files may not be downloadable.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      fileHandle: z
        .string()
        .describe(
          'Exact file handle returned by get_candidate or manage_offer; this is distinct from a file ID.'
        ),
      fileName: z
        .string()
        .optional()
        .describe('Optional display filename; the file lookup does not supply metadata.')
    })
  )
  .output(
    z.object({
      prepared: z.boolean(),
      fileName: z.string().optional(),
      warnings: warningsSchema
    })
  )
  .handleInvocation(async ctx => {
    const client = new AshbyClient(ctx.auth);
    const fileName =
      ctx.input.fileName === undefined ? undefined : text(ctx.input.fileName, 'Filename');
    if (
      fileName !== undefined &&
      (fileName.length > 255 ||
        /[/\\]/.test(fileName) ||
        [...fileName].some(char => char.charCodeAt(0) < 32))
    )
      invalid(
        'Use a display filename without paths or control characters, up to 255 characters.'
      );
    if (fileName !== undefined) safeData(fileName, ctx.auth);
    const file = await downloadDetails(client, ctx.input.fileHandle);
    await ctx.addAttachment({
      type: 'url',
      url: file.url,
      filename: fileName,
      refreshReference: { fileHandle: file.fileHandle },
      refreshAt: file.expiresAt
    });
    return {
      output: { prepared: true, fileName, warnings: client.warnings },
      message: 'Prepared the requested downloadable file.'
    };
  })
  .build();
export const getFileUrl = getFileUrlTool(spec, async ctx => {
  const parsed = reference.safeParse(ctx.input.reference);
  if (!parsed.success) invalid('The file reference is invalid. Request the file again.');
  const file = await downloadDetails(new AshbyClient(ctx.auth), parsed.data.fileHandle);
  return { url: file.url, expiresAt: file.expiresAt, headers: {}, query: {} };
});
