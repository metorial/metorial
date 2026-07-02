import { SlateTool } from 'slates';
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
      artifactContent: z.string().optional().describe('Downloaded artifact content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppVeyorClient({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    switch (ctx.input.action) {
      case 'log': {
        let log = await client.getBuildJobLog(ctx.input.jobId);
        return {
          output: { log },
          message: `Retrieved build log for job **${ctx.input.jobId}**.`
        };
      }

      case 'listArtifacts': {
        let artifacts = await client.listBuildJobArtifacts(ctx.input.jobId);
        let mapped = artifacts.map((a: any) => ({
          fileName: a.fileName,
          name: a.name,
          type: a.type,
          size: a.size,
          created: a.created
        }));
        return {
          output: { artifacts: mapped },
          message: `Found **${mapped.length}** artifact(s) for job **${ctx.input.jobId}**.`
        };
      }

      case 'downloadArtifact': {
        if (!ctx.input.artifactFileName) {
          throw new Error('artifactFileName is required for downloadArtifact');
        }
        let content = await client.downloadBuildJobArtifact(
          ctx.input.jobId,
          ctx.input.artifactFileName
        );
        return {
          output: { artifactContent: content },
          message: `Downloaded artifact **${ctx.input.artifactFileName}** from job **${ctx.input.jobId}**.`
        };
      }

      default:
        throw new Error(`Unknown action: ${ctx.input.action}`);
    }
  })
  .build();
