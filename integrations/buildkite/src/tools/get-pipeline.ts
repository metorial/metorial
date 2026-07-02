import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPipeline = SlateTool.create(spec, {
  name: 'Get Pipeline',
  key: 'get_pipeline',
  description: `Retrieve detailed information about a specific Buildkite pipeline by its slug. Returns configuration, repository, build counts, provider settings, and step definitions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pipelineSlug: z.string().describe('The slug of the pipeline to retrieve')
    })
  )
  .output(
    z.object({
      pipelineId: z.string().describe('UUID of the pipeline'),
      pipelineSlug: z.string().describe('URL-friendly slug of the pipeline'),
      name: z.string().describe('Name of the pipeline'),
      description: z.string().nullable().describe('Description of the pipeline'),
      repository: z.string().describe('Repository URL'),
      defaultBranch: z.string().describe('Default branch for the pipeline'),
      branchConfiguration: z.string().nullable().describe('Branch filter configuration'),
      webUrl: z.string().describe('URL to the pipeline on Buildkite'),
      configuration: z.string().describe('Pipeline YAML configuration'),
      runningBuildsCount: z.number().describe('Number of currently running builds'),
      scheduledBuildsCount: z.number().describe('Number of scheduled builds'),
      tags: z.array(z.string()).describe('Tags assigned to the pipeline'),
      archived: z.boolean().describe('Whether the pipeline is archived'),
      visibility: z.string().describe('Pipeline visibility setting'),
      createdAt: z.string().describe('When the pipeline was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

    let p = await client.getPipeline(ctx.input.pipelineSlug);

    return {
      output: {
        pipelineId: p.id,
        pipelineSlug: p.slug,
        name: p.name,
        description: p.description ?? null,
        repository: p.repository,
        defaultBranch: p.default_branch,
        branchConfiguration: p.branch_configuration ?? null,
        webUrl: p.web_url,
        configuration: p.configuration ?? '',
        runningBuildsCount: p.running_builds_count,
        scheduledBuildsCount: p.scheduled_builds_count,
        tags: p.tags ?? [],
        archived: p.archived_at !== null,
        visibility: p.visibility ?? 'private',
        createdAt: p.created_at
      },
      message: `Retrieved pipeline **${p.name}** (\`${p.slug}\`).`
    };
  });
