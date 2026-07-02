import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let pipelineSchema = z.object({
  pipelineId: z.string().describe('UUID of the pipeline'),
  pipelineSlug: z.string().describe('URL-friendly slug of the pipeline'),
  name: z.string().describe('Name of the pipeline'),
  description: z.string().nullable().describe('Description of the pipeline'),
  repository: z.string().describe('Repository URL'),
  defaultBranch: z.string().describe('Default branch for the pipeline'),
  webUrl: z.string().describe('URL to the pipeline on Buildkite'),
  buildsUrl: z.string().describe('API URL for builds'),
  running_builds_count: z.number().describe('Number of currently running builds'),
  scheduled_builds_count: z.number().describe('Number of scheduled builds'),
  tags: z.array(z.string()).describe('Tags assigned to the pipeline'),
  archived: z.boolean().describe('Whether the pipeline is archived'),
  createdAt: z.string().describe('When the pipeline was created')
});

export let listPipelines = SlateTool.create(spec, {
  name: 'List Pipelines',
  key: 'list_pipelines',
  description: `List CI/CD pipelines in your Buildkite organization. Returns pipeline names, slugs, repositories, and current build counts. Use this to discover available pipelines before triggering builds or inspecting pipeline details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      pipelines: z.array(pipelineSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

    let pipelines = await client.listPipelines({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let mapped = pipelines.map((p: any) => ({
      pipelineId: p.id,
      pipelineSlug: p.slug,
      name: p.name,
      description: p.description ?? null,
      repository: p.repository,
      defaultBranch: p.default_branch,
      webUrl: p.web_url,
      buildsUrl: p.builds_url,
      running_builds_count: p.running_builds_count,
      scheduled_builds_count: p.scheduled_builds_count,
      tags: p.tags ?? [],
      archived: p.archived_at !== null,
      createdAt: p.created_at
    }));

    return {
      output: { pipelines: mapped },
      message: `Found **${mapped.length}** pipeline(s).`
    };
  });
