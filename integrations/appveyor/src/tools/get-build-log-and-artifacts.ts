import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { AppVeyorClient } from '../lib/client';
import { spec } from '../spec';

let artifactSchema = z.object({
  fileName: z.string().describe('Artifact file name'),
  name: z.string().optional().describe('Artifact display name'),
  type: z
    .string()
    .optional()
    .describe('Artifact type (Auto, File, Zip, NuGetPackage, WebDeployPackage, etc.)'),
  size: z.number().optional().describe('Artifact size in bytes'),
  created: z.string().optional().describe('Artifact creation timestamp')
});

export let getBuildLogAndArtifacts = SlateTool.create(spec, {
  name: 'Get Build Log & Artifacts',
  key: 'get_build_log_and_artifacts',
  description: `Retrieve build job logs, list artifacts, or download a specific artifact. Operates on a specific build job identified by its job ID.`,
  instructions: [
    'For **log**: provide jobId to download the build log.',
    'For **listArtifacts**: provide jobId to list all artifacts.',
    'For **downloadArtifact**: provide jobId and artifactFileName.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['log', 'listArtifacts', 'downloadArtifact'])
        .describe('Operation to perform'),
      jobId: z.string().describe('Build job ID'),
      artifactFileName: z
        .string()
        .optional()
        .describe('Artifact file name (required for downloadArtifact)')
    })
  )
  .output(
    z.object({
      log: z.string().optional().describe('Build log content'),
      artifacts: z.array(artifactSchema).optional().describe('List of build artifacts'),
      artifactContent: z.string().optional().describe('Downloaded artifact content'),
      fileName: z.string().optional().describe('Name of the downloadable file'),
      downloadUrl: z
        .string()
        .optional()
        .describe('Provider endpoint for the downloadable file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppVeyorClient({
      token: ctx.auth.token,
      accountName: ctx.auth.accountName ?? (ctx.config as { accountName?: string }).accountName
    });

    switch (ctx.input.action) {
      case 'log': {
        let downloadUrl = client.getBuildJobLogUrl(ctx.input.jobId);
        let fileName = `build-${ctx.input.jobId}.log`;
        let file = await client.downloadFile(downloadUrl);
        await ctx.addAttachment({
          type: 'content',
          content: new Response(new Uint8Array(file.bytes), {
            headers: { 'Content-Type': 'text/plain' }
          }),
          filename: fileName,
          mimeType: 'text/plain'
        });
        return {
          output: { log: file.text, fileName, downloadUrl },
          message: `Prepared the build log for job **${ctx.input.jobId}** for download.`
        };
      }

      case 'listArtifacts': {
        let artifacts = await client.listBuildJobArtifacts(ctx.input.jobId);
        let mapped = artifacts.map((a: any) => ({
          fileName: a.fileName,
          name: typeof a.name === 'string' ? a.name : undefined,
          type: typeof a.type === 'string' ? a.type : undefined,
          size: typeof a.size === 'number' ? a.size : undefined,
          created: typeof a.created === 'string' ? a.created : undefined
        }));
        return {
          output: { artifacts: mapped },
          message: `Found **${mapped.length}** artifact(s) for job **${ctx.input.jobId}**.`
        };
      }

      case 'downloadArtifact': {
        if (!ctx.input.artifactFileName) {
          throw createApiServiceError('artifactFileName is required for downloadArtifact');
        }
        let downloadUrl = client.getBuildJobArtifactUrl(
          ctx.input.jobId,
          ctx.input.artifactFileName
        );
        let file = await client.downloadFile(downloadUrl);
        await ctx.addAttachment({
          type: 'content',
          content: new Response(new Uint8Array(file.bytes)),
          filename: ctx.input.artifactFileName
        });
        return {
          output: {
            artifactContent: file.text,
            fileName: ctx.input.artifactFileName,
            downloadUrl
          },
          message: `Prepared artifact **${ctx.input.artifactFileName}** from job **${ctx.input.jobId}** for download.`
        };
      }

      default:
        throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
    }
  })
  .build();
