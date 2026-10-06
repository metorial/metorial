import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { organizationInput } from '../lib/schemas';
import { spec } from '../spec';

export let createPipeline = SlateTool.create(spec, {
  name: 'Create Pipeline',
  key: 'create_pipeline',
  description: `Create a new CI/CD pipeline in your Buildkite organization. Specify a name, repository URL, nonempty YAML configuration and a cluster UUID from list_clusters. Branch settings, team assignments and tags are optional.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      ...organizationInput,
      name: z.string().describe('Name of the pipeline'),
      repository: z
        .string()
        .describe('URL of the source code repository (e.g. git@github.com:org/repo.git)'),
      configuration: z
        .string()
        .optional()
        .describe('Required nonempty pipeline step configuration in YAML format'),
      description: z.string().optional().describe('Description of the pipeline'),
      defaultBranch: z.string().optional().describe('Default branch (defaults to "main")'),
      branchConfiguration: z
        .string()
        .optional()
        .describe('Branch filter pattern (e.g. "main develop release/*")'),
      skipQueuedBranchBuilds: z
        .boolean()
        .optional()
        .describe('Skip queued branch builds when a new commit is pushed'),
      cancelRunningBranchBuilds: z
        .boolean()
        .optional()
        .describe('Cancel running builds when a new commit is pushed'),
      teamUuids: z
        .array(z.string())
        .optional()
        .describe(
          'Legacy team UUIDs from list_teams. Prefer teams with explicit access levels; do not supply both.'
        ),
      clusterUuid: z
        .string()
        .optional()
        .describe('Required cluster UUID. Call list_clusters to discover clusters.'),
      teams: z
        .record(z.string(), z.enum(['read_only', 'build_and_read', 'manage_build_and_read']))
        .optional()
        .describe(
          'Team UUIDs from list_teams mapped to pipeline access levels. Do not combine with teamUuids.'
        ),
      tags: z.array(z.string()).optional().describe('Tags to assign to the pipeline'),
      visibility: z.enum(['private', 'public']).optional().describe('Pipeline visibility')
    })
  )
  .output(
    z.object({
      pipelineId: z.string().describe('UUID of the created pipeline'),
      pipelineSlug: z.string().describe('URL-friendly slug of the pipeline'),
      name: z.string().describe('Name of the pipeline'),
      webUrl: z.string().describe('URL to the pipeline on Buildkite'),
      createdAt: z.string().describe('When the pipeline was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let p = await client.createPipeline(ctx.input);

    return {
      output: {
        pipelineId: p.id,
        pipelineSlug: p.slug,
        name: p.name,
        webUrl: p.web_url,
        createdAt: p.created_at
      },
      message: `Created pipeline **${p.name}** (\`${p.slug}\`).`
    };
  });
