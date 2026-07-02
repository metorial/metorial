import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubActionsClient } from '../lib/client';
import { spec } from '../spec';

let artifactSchema = z.object({
  artifactId: z.number().describe('Artifact ID'),
  name: z.string().describe('Artifact name'),
  sizeInBytes: z.number().describe('Artifact size in bytes'),
  expired: z.boolean().describe('Whether the artifact has expired'),
  createdAt: z.string().nullable().describe('Creation timestamp'),
  updatedAt: z.string().nullable().describe('Last update timestamp'),
  expiresAt: z.string().nullable().describe('Expiration timestamp'),
  workflowRunId: z.number().optional().describe('Associated workflow run ID')
});

export let listArtifacts = SlateTool.create(spec, {
  name: 'List Artifacts',
  key: 'list_artifacts',
  description: `List workflow artifacts for a repository or a specific workflow run. Artifacts enable data sharing between jobs and persist after workflow completion. Returns artifact metadata including size, expiration, and download information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name'),
      runId: z
        .number()
        .optional()
        .describe('Filter to artifacts from a specific workflow run'),
      name: z.string().optional().describe('Filter by artifact name'),
      perPage: z.number().optional().describe('Results per page (max 100, default 30)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of artifacts'),
      artifacts: z.array(artifactSchema).describe('List of artifacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubActionsClient(ctx.auth.token);
    let { owner, repo, runId, name, perPage, page } = ctx.input;

    let data = runId
      ? await client.listArtifactsForRun(owner, repo, runId, { perPage, page, name })
      : await client.listArtifactsForRepo(owner, repo, { perPage, page, name });

    let artifacts = (data.artifacts ?? []).map((a: any) => ({
      artifactId: a.id,
      name: a.name,
      sizeInBytes: a.size_in_bytes,
      expired: a.expired,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
      expiresAt: a.expires_at,
      workflowRunId: a.workflow_run?.id
    }));

    return {
      output: {
        totalCount: data.total_count,
        artifacts
      },
      message: `Found **${data.total_count}** artifacts${runId ? ` for run #${runId}` : ''} in **${owner}/${repo}**.`
    };
  })
  .build();
