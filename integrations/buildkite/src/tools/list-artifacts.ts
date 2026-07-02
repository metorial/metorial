import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let artifactSchema = z.object({
  artifactId: z.string().describe('UUID of the artifact'),
  jobId: z.string().describe('UUID of the job that produced the artifact'),
  filename: z.string().describe('Filename of the artifact'),
  path: z.string().describe('Path of the artifact relative to the build directory'),
  mimeType: z.string().describe('MIME type of the artifact'),
  fileSize: z.number().describe('Size of the artifact in bytes'),
  sha1sum: z.string().describe('SHA1 checksum of the artifact'),
  downloadUrl: z.string().describe('URL to download the artifact')
});

export let listArtifacts = SlateTool.create(spec, {
  name: 'List Artifacts',
  key: 'list_artifacts',
  description: `List artifacts produced by a specific build. Returns file names, paths, sizes, and download URLs. Artifacts are files generated during build execution (test reports, binaries, logs, etc.).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pipelineSlug: z.string().describe('Slug of the pipeline'),
      buildNumber: z.number().describe('Build number'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      artifacts: z.array(artifactSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

    let artifacts = await client.listArtifacts(ctx.input.pipelineSlug, ctx.input.buildNumber, {
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let mapped = artifacts.map((a: any) => ({
      artifactId: a.id,
      jobId: a.job_id,
      filename: a.filename,
      path: a.path,
      mimeType: a.mime_type,
      fileSize: a.file_size,
      sha1sum: a.sha1sum,
      downloadUrl: a.download_url
    }));

    return {
      output: { artifacts: mapped },
      message: `Found **${mapped.length}** artifact(s) for build #${ctx.input.buildNumber}.`
    };
  });
