import { SlateTool } from 'slates';
import { z } from 'zod';
import { CloudAgentsClient } from '../lib/client';
import { spec } from '../spec';

export let downloadArtifact = SlateTool.create(spec, {
  name: 'Download Artifact',
  key: 'download_artifact',
  description: `Get a temporary download URL for a specific agent artifact file. The returned presigned URL is valid for 15 minutes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      agentId: z.string().describe('ID of the agent'),
      artifactPath: z
        .string()
        .describe('Absolute path of the artifact to download (from list artifacts)')
    })
  )
  .output(
    z.object({
      downloadUrl: z.string().describe('Presigned download URL (valid for 15 minutes)'),
      expiresAt: z.string().describe('ISO 8601 timestamp when the download URL expires')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CloudAgentsClient({ token: ctx.auth.token });
    let result = await client.downloadArtifact(ctx.input.agentId, ctx.input.artifactPath);

    return {
      output: {
        downloadUrl: result.url,
        expiresAt: result.expiresAt
      },
      message: `Download URL generated for \`${ctx.input.artifactPath}\`. Expires at ${result.expiresAt}.`
    };
  })
  .build();
