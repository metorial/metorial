import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { archiveUrl } from '../lib/schemas';
import { spec } from '../spec';

let archiveSchema = z.object({
  startAt: z.string().describe('Start timestamp of the archive period'),
  endAt: z.string().describe('End timestamp of the archive period'),
  filename: z.string().describe('Archive filename'),
  filesize: z.number().describe('Archive file size in bytes'),
  downloadUrl: z.string().describe('URL to download the archive (gzipped TSV)')
});

export let listArchives = SlateTool.create(spec, {
  name: 'List Archives',
  key: 'list_archives',
  description: `List all available log archive files. Archives are hourly or daily gzipped TSV files containing permanent log records. Returns download URLs for each archive.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      archives: z.array(archiveSchema).describe('Array of available archive files')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listArchives();

    let archives = data.map(a => ({
      startAt: a.start,
      endAt: a.end,
      filename: a.filename,
      filesize: a.filesize,
      downloadUrl: archiveUrl(a._links.download.href)
    }));

    return {
      output: { archives },
      message: `Found **${archives.length}** archive(s) available for download.`
    };
  })
  .build();
