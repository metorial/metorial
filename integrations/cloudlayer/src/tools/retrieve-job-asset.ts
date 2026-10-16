import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { attachAsset, findJobAsset } from '../lib/files';
import { assetOutput, jobOutput } from '../lib/responses';
import { assetSchema } from '../lib/schemas';
import { spec } from '../spec';

export let retrieveJobAsset = SlateTool.create(spec, {
  name: 'Retrieve Job Asset',
  key: 'retrieve_job_asset',
  description:
    'Check a generation job and download its stored PDF or image after it succeeds. Correlates the provider asset jobId with the actual job ID. Searches a bounded number of asset pages; pass nextAssetCursor to continue if the result is older.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      jobId: z
        .string()
        .min(1)
        .describe('Generation job ID returned by a generation tool or list_jobs'),
      startAfterId: z
        .string()
        .optional()
        .describe('Asset cursor returned as nextAssetCursor by the preceding call'),
      maxPages: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .describe(
          'Maximum asset pages to inspect, default 3; each request asks for up to 100 assets'
        )
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Job ID reported by Cloudlayer'),
      status: z.string().describe('Job status reported by Cloudlayer'),
      asset: assetSchema
        .omit({ url: true, raw: true })
        .optional()
        .describe('Metadata for the generated downloadable file'),
      searchedPages: z.number().describe('Number of asset pages inspected by this call'),
      nextAssetCursor: z.string().optional().describe('Cursor for continuing the asset search')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let job = jobOutput(await client.getJob(ctx.input.jobId));
    if (job.status !== 'success')
      return {
        output: { jobId: job.jobId, status: job.status, searchedPages: 0 },
        message: `Job **${job.jobId}** has status **${job.status}**. A file is available after success.`
      };
    let found = await findJobAsset(
      client,
      job.jobId,
      ctx.input.maxPages ?? 3,
      ctx.input.startAfterId
    );
    let output = {
      jobId: job.jobId,
      status: job.status,
      searchedPages: found.pages,
      ...pickDefined({ nextAssetCursor: found.nextCursor })
    };
    if (!found.asset)
      return {
        output,
        message:
          'The job succeeded, but no matching stored file was found in the inspected asset pages. Continue with nextAssetCursor when provided, or use list_assets to inspect available files.'
      };
    let asset = assetOutput(found.asset);
    if (!asset.url)
      throw createApiServiceError(
        'Cloudlayer returned matching asset metadata without a download URL. Retrieve the asset again with get_asset or check its storage configuration.'
      );
    await attachAsset(ctx, found.asset);
    let { url: _url, raw: _raw, ...metadata } = asset;
    return {
      output: { ...output, asset: metadata },
      message: `Prepared asset **${asset.assetId}** for download.`
    };
  })
  .build();
