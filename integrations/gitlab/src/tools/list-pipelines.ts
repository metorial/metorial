import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, resolveProjectId } from '../lib/helpers';
import { spec } from '../spec';

export let listPipelines = SlateTool.create(spec, {
  name: 'List Pipelines',
  key: 'list_pipelines',
  description: `List CI/CD pipelines for a project. Filter by status, ref (branch/tag), SHA, source, or pipeline name. Useful for monitoring build and deployment status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Project ID or URL-encoded path. Falls back to config default.'),
      status: z
        .enum([
          'created',
          'waiting_for_resource',
          'preparing',
          'pending',
          'running',
          'success',
          'failed',
          'canceled',
          'skipped',
          'manual',
          'scheduled'
        ])
        .optional()
        .describe('Filter by pipeline status'),
      ref: z.string().optional().describe('Filter by branch or tag name'),
      sha: z.string().optional().describe('Filter by commit SHA'),
      scope: z.string().optional().describe('Filter by pipeline scope'),
      source: z
        .string()
        .optional()
        .describe('Filter by pipeline source (push, web, trigger, schedule, etc.)'),
      name: z.string().optional().describe('Filter by pipeline name'),
      yamlErrors: z.boolean().optional().describe('Filter pipelines with YAML errors'),
      orderBy: z
        .enum(['id', 'status', 'ref', 'updated_at', 'user_id'])
        .optional()
        .describe('Order by field'),
      sort: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      perPage: z.number().optional().describe('Results per page (max 100)'),
      page: z.number().optional().describe('Page number')
    })
  )
  .output(
    z.object({
      pipelines: z.array(
        z.object({
          pipelineId: z.number().describe('Pipeline ID'),
          pipelineIid: z.number().nullable().describe('Pipeline IID'),
          iid: z.number().optional().describe('Pipeline IID within the project'),
          projectId: z.number().optional().describe('Numeric project ID'),
          status: z.string().describe('Pipeline status'),
          ref: z.string().describe('Branch/tag'),
          sha: z.string().describe('Commit SHA'),
          webUrl: z.string().optional().describe('URL to the pipeline'),
          source: z.string().optional().nullable().describe('Pipeline source'),
          yamlErrors: z.string().optional().nullable().describe('YAML validation errors'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          updatedAt: z.string().optional().describe('Last update timestamp'),
          name: z.string().optional().nullable().describe('Pipeline name')
        })
      ),
      totalPages: z.number().describe('Total pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let projectId = resolveProjectId(ctx.input.projectId, ctx.config.projectId);

    let result = await client.listPipelines(projectId, {
      status: ctx.input.status,
      scope: ctx.input.scope,
      ref: ctx.input.ref,
      sha: ctx.input.sha,
      source: ctx.input.source,
      name: ctx.input.name,
      yamlErrors: ctx.input.yamlErrors,
      orderBy: ctx.input.orderBy,
      sort: ctx.input.sort,
      perPage: ctx.input.perPage,
      page: ctx.input.page
    });

    let pipelines = result.pipelines.map((p: any) => ({
      pipelineId: p.id,
      pipelineIid: p.iid || null,
      iid: p.iid,
      projectId: p.project_id,
      status: p.status,
      ref: p.ref,
      sha: p.sha,
      webUrl: p.web_url,
      source: p.source || null,
      yamlErrors: p.yaml_errors,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      name: p.name
    }));

    return {
      output: { pipelines, totalPages: result.totalPages },
      message: `Found **${pipelines.length}** pipelines${ctx.input.status ? ` with status "${ctx.input.status}"` : ''}`
    };
  })
  .build();
