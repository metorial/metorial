import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { archiveUrl } from '../lib/schemas';
import { spec } from '../spec';

export const downloadArchive = SlateTool.create(spec, {
  name: 'Download Log Archive',
  key: 'download_archive',
  description:
    'Prepare an available gzipped TSV log archive for download. Use a filename from List Archives; archives are divided by UTC day or hour and require access to archived account logs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      filename: z
        .string()
        .describe(
          'Exact archive filename returned by List Archives, such as 2026-10-01-00.tsv.gz'
        )
    })
  )
  .output(
    z.object({
      filename: z.string(),
      filesize: z.number(),
      startAt: z.string(),
      endAt: z.string(),
      mimeType: z.string()
    })
  )
  .handleInvocation(async ctx => {
    if (!/^\d{4}-\d{2}-\d{2}(?:-\d{2})?\.tsv\.gz$/.test(ctx.input.filename))
      throw createApiServiceError('Choose an exact UTC archive filename from list_archives.');
    const archive = (await new Client(ctx.auth).listArchives()).find(
      a => a.filename === ctx.input.filename
    );
    if (!archive)
      throw createApiServiceError(
        'That archive is not currently available. Run list_archives and choose an available filename.'
      );
    const mimeType = 'application/gzip';
    await ctx.addAttachment({
      type: 'url',
      url: archiveUrl(archive._links.download.href),
      filename: archive.filename,
      mimeType,
      headers: { 'X-Papertrail-Token': ctx.auth.token }
    });
    return {
      output: {
        filename: archive.filename,
        filesize: archive.filesize,
        startAt: archive.start,
        endAt: archive.end,
        mimeType
      },
      message: `Prepared **${archive.filename}** for download.`
    };
  })
  .build();
