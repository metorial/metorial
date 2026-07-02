import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubActionsClient } from '../lib/client';
import { spec } from '../spec';

export let manageArtifact = SlateTool.create(spec, {
  name: 'Manage Artifact',
  key: 'manage_artifact',
  description: `Get details about a specific artifact, download it (returns a download URL), or delete it. Use "get" to view metadata, "download" to get a zip archive URL, or "delete" to remove the artifact.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name'),
      artifactId: z.number().describe('Artifact ID'),
      action: z.enum(['get', 'download', 'delete']).describe('Action to perform')
    })
  )
  .output(
    z.object({
      artifactId: z.number().optional().describe('Artifact ID'),
      name: z.string().optional().describe('Artifact name'),
      sizeInBytes: z.number().optional().describe('Artifact size in bytes'),
      expired: z.boolean().optional().describe('Whether the artifact has expired'),
      downloadUrl: z.string().optional().describe('URL to download the artifact zip archive'),
      deleted: z.boolean().optional().describe('Whether the artifact was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubActionsClient(ctx.auth.token);
    let { owner, repo, artifactId, action } = ctx.input;

    if (action === 'delete') {
      await client.deleteArtifact(owner, repo, artifactId);
      return {
        output: { deleted: true },
        message: `Deleted artifact **${artifactId}** from **${owner}/${repo}**.`
      };
    }

    if (action === 'download') {
      let url = await client.downloadArtifact(owner, repo, artifactId);
      return {
        output: { downloadUrl: typeof url === 'string' ? url : '', artifactId },
        message: `Retrieved download URL for artifact **${artifactId}**.`
      };
    }

    let artifact = await client.getArtifact(owner, repo, artifactId);
    return {
      output: {
        artifactId: artifact.id,
        name: artifact.name,
        sizeInBytes: artifact.size_in_bytes,
        expired: artifact.expired
      },
      message: `Artifact **${artifact.name}** (${artifact.size_in_bytes} bytes)${artifact.expired ? ' — expired' : ''}.`
    };
  })
  .build();
