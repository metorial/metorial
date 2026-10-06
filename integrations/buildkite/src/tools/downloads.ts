import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import {
  buildNumberSchema,
  jobIdSchema,
  organizationInput,
  pipelineSlugSchema
} from '../lib/schemas';
import { spec } from '../spec';

const jobInput = {
  ...organizationInput,
  pipelineSlug: pipelineSlugSchema,
  buildNumber: buildNumberSchema,
  jobId: jobIdSchema
};
export const downloadJobLog = SlateTool.create(spec, {
  key: 'download_job_log',
  name: 'Download Job Log',
  description:
    'Prepare a downloadable plain-text job log. Call get_build to discover the job UUID. Optionally inspect its environment variables. Requires read_build_logs and read_job_env when environment is requested.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...jobInput,
      includeEnvironment: z
        .boolean()
        .optional()
        .describe('Include the job environment; only request this for a trusted build.')
    })
  )
  .output(
    z.object({
      jobId: z.string(),
      size: z.number(),
      mimeType: z.string(),
      environment: z.record(z.string(), z.string()).optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const size = await client.getJobLogSize(
      ctx.input.pipelineSlug,
      ctx.input.buildNumber,
      ctx.input.jobId
    );
    const environment = ctx.input.includeEnvironment
      ? ((
          await client.getJobEnvironment(
            ctx.input.pipelineSlug,
            ctx.input.buildNumber,
            ctx.input.jobId
          )
        ).env ?? {})
      : undefined;
    await ctx.addAttachment({
      type: 'url',
      url: client.downloadUrl(
        `${client.jobPath(ctx.input.pipelineSlug, ctx.input.buildNumber, ctx.input.jobId)}/log.txt`
      ),
      headers: { Authorization: `Bearer ${ctx.auth.token}` },
      mimeType: 'text/plain'
    });
    return {
      output: { jobId: ctx.input.jobId, size, mimeType: 'text/plain', environment },
      message: 'Prepared the job log for download.'
    };
  });
export const downloadArtifact = SlateTool.create(spec, {
  key: 'download_artifact',
  name: 'Download Artifact',
  description:
    'Prepare a downloadable build artifact. Call list_artifacts for artifact and job UUIDs. Requires read_artifacts.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...jobInput,
      artifactId: z.string().describe('Artifact UUID from list_artifacts.')
    })
  )
  .output(
    z.object({
      artifactId: z.string(),
      jobId: z.string(),
      filename: z.string(),
      mimeType: z.string(),
      fileSize: z.number(),
      sha1sum: z.string()
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const artifact = await client.getArtifact(
      ctx.input.pipelineSlug,
      ctx.input.buildNumber,
      ctx.input.jobId,
      ctx.input.artifactId
    );
    if (artifact.state && artifact.state !== 'finished')
      throw createApiServiceError(
        `The artifact is ${artifact.state}; choose a finished artifact from list_artifacts.`
      );
    await ctx.addAttachment({
      type: 'url',
      url: client.downloadUrl(
        `${client.artifactPath(ctx.input.pipelineSlug, ctx.input.buildNumber, ctx.input.jobId, ctx.input.artifactId)}/download`
      ),
      headers: { Authorization: `Bearer ${ctx.auth.token}` },
      mimeType: artifact.mime_type || 'application/octet-stream'
    });
    return {
      output: {
        artifactId: artifact.id,
        jobId: artifact.job_id,
        filename: artifact.filename,
        mimeType: artifact.mime_type || 'application/octet-stream',
        fileSize: artifact.file_size,
        sha1sum: artifact.sha1sum
      },
      message: `Prepared **${artifact.filename}** for download.`
    };
  });
