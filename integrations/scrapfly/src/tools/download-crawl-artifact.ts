import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadCrawlArtifact = SlateTool.create(spec, {
  name: 'Download Crawl Artifact',
  key: 'download_crawl_artifact',
  description:
    'Download a completed or cancelled crawl as a compressed WARC archive or a HAR file containing its collected HTTP requests, responses, and content.',
  instructions: [
    'Use get_crawl_status first. Archives are finalized when isFinished is true.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      crawlUuid: z.string().describe('UUID returned by start_crawl.'),
      artifactType: z
        .enum(['warc', 'har'])
        .describe('warc for a gzip-compressed web archive; har for a JSON HTTP archive.')
    })
  )
  .output(
    z.object({
      crawlUuid: z.string(),
      artifactType: z.enum(['warc', 'har']),
      filename: z.string(),
      mimeType: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let status = await client.getCrawlStatus(ctx.input.crawlUuid);
    if (!status.is_finished) {
      throw createApiServiceError(
        'The crawl archive is not finalized. Wait until get_crawl_status reports isFinished=true.'
      );
    }
    let filename = `crawl-${ctx.input.crawlUuid}.${ctx.input.artifactType === 'warc' ? 'warc.gz' : 'har'}`;
    let mimeType = ctx.input.artifactType === 'warc' ? 'application/gzip' : 'application/json';
    await ctx.addAttachment({
      type: 'url',
      url: `https://api.scrapfly.io/crawl/${encodeURIComponent(ctx.input.crawlUuid)}/artifact`,
      query: { key: ctx.auth.token, type: ctx.input.artifactType },
      filename,
      mimeType
    });
    return {
      output: {
        crawlUuid: ctx.input.crawlUuid,
        artifactType: ctx.input.artifactType,
        filename,
        mimeType
      },
      message: `Prepared ${ctx.input.artifactType.toUpperCase()} archive for crawl \`${ctx.input.crawlUuid}\`.`
    };
  })
  .build();
