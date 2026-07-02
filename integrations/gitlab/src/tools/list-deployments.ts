import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, resolveProjectId } from '../lib/helpers';
import { spec } from '../spec';

export let listDeployments = SlateTool.create(spec, {
  name: 'List Deployments',
  key: 'list_deployments',
  description: `List deployments for a project, optionally filtered by environment or status. Returns deployment details including the associated commit, environment, and timing information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Project ID or URL-encoded path. Falls back to config default.'),
      environment: z.string().optional().describe('Filter by environment name'),
      status: z
        .enum(['created', 'running', 'success', 'failed', 'canceled', 'blocked'])
        .optional()
        .describe('Filter by deployment status'),
      orderBy: z
        .enum(['id', 'iid', 'created_at', 'updated_at', 'ref'])
        .optional()
        .describe('Order by field'),
      sort: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      perPage: z.number().optional().describe('Number of results per page (max 100)'),
      page: z.number().optional().describe('Page number')
    })
  )
  .output(
    z.object({
      deployments: z.array(
        z.object({
          deploymentId: z.number(),
          iid: z.number().optional(),
          status: z.string(),
          ref: z.string(),
          sha: z.string().optional(),
          environmentName: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          deployableId: z.number().optional().nullable(),
          userName: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let projectId = resolveProjectId(ctx.input.projectId, ctx.config.projectId);

    let result = (await client.listDeployments(projectId, {
      environment: ctx.input.environment,
      status: ctx.input.status,
      order_by: ctx.input.orderBy,
      sort: ctx.input.sort,
      perPage: ctx.input.perPage,
      page: ctx.input.page
    })) as any[];

    let deployments = result.map((d: any) => ({
      deploymentId: d.id,
      iid: d.iid,
      status: d.status,
      ref: d.ref,
      sha: d.sha,
      environmentName: d.environment?.name,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      deployableId: d.deployable?.id,
      userName: d.user?.name || d.user?.username
    }));

    return {
      output: { deployments },
      message: `Found **${deployments.length}** deployment(s) in project **${projectId}**.`
    };
  })
  .build();
