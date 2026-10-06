import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubActionsClient, githubHeaders } from '../lib/client';
import { validateInput } from '../lib/validation';
import { spec } from '../spec';

export let manageArtifact = SlateTool.create(spec, {
  name: 'Manage Artifact',
  key: 'manage_artifact',
  description: `Inspect, download a ZIP archive of, or permanently delete a workflow artifact. Expired or deleted artifacts cannot be downloaded.`,
  tags: {
    readOnly: false,
    destructive: true
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
      downloadUrl: z
        .string()
        .optional()
        .describe(
          'Temporary provider download URL; expires after one minute. Request the download again to obtain a fresh URL while the file exists'
        ),
      deleted: z.boolean().optional().describe('Whether the artifact was deleted')
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
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
      const artifact = await client.getArtifact(owner, repo, artifactId);
      if (artifact.expired)
        throw createApiServiceError(
          'This GitHub artifact has expired and can no longer be downloaded.'
        );
      let file = await client.downloadArtifact(owner, repo, artifactId);
      await ctx.addAttachment({
        type: 'url',
        url: file.apiUrl,
        mimeType: 'application/zip',
        filename: `artifact-${artifactId}.zip`,
        headers: { ...githubHeaders, Authorization: `Bearer ${ctx.auth.token}` }
      });
      return {
        output: { downloadUrl: file.downloadUrl, artifactId },
        message: `Prepared archive download for artifact **${artifactId}**.`
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
