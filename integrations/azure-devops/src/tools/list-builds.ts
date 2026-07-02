import { SlateTool } from 'slates';
import { z } from 'zod';
import { AzureDevOpsClient } from '../lib/client';
import { spec } from '../spec';

export let listBuildsTool = SlateTool.create(spec, {
  name: 'List Builds',
  key: 'list_builds',
  description: `List recent builds in a project. Filter by pipeline definition, branch, status, or result. Useful for monitoring build health and finding specific build runs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      project: z
        .string()
        .optional()
        .describe('Project name or ID. Uses default project from config if not provided.'),
      definitionIds: z
        .array(z.number())
        .optional()
        .describe('Filter by pipeline/build definition IDs'),
      statusFilter: z
        .enum([
          'all',
          'cancelling',
          'completed',
          'inProgress',
          'none',
          'notStarted',
          'postponed'
        ])
        .optional()
        .describe('Filter by build status'),
      resultFilter: z
        .enum(['canceled', 'failed', 'none', 'partiallySucceeded', 'succeeded'])
        .optional()
        .describe('Filter by build result'),
      branchName: z.string().optional().describe('Filter by branch (e.g. "refs/heads/main")'),
      top: z.number().optional().describe('Maximum number of builds to return')
    })
  )
  .output(
    z.object({
      builds: z.array(
        z.object({
          buildId: z.number(),
          buildNumber: z.string().optional(),
          status: z.string(),
          result: z.string().optional(),
          sourceBranch: z.string().optional(),
          sourceVersion: z.string().optional(),
          definitionName: z.string().optional(),
          definitionId: z.number().optional(),
          requestedBy: z.string().optional(),
          startTime: z.string().optional(),
          finishTime: z.string().optional(),
          url: z.string().optional()
        })
      ),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AzureDevOpsClient({
      token: ctx.auth.token,
      organization: ctx.config.organization
    });
    let project = ctx.input.project || ctx.config.project;
    if (!project) throw new Error('Project is required.');

    let result = await client.listBuilds(project, {
      definitions: ctx.input.definitionIds,
      statusFilter: ctx.input.statusFilter,
      resultFilter: ctx.input.resultFilter,
      branchName: ctx.input.branchName,
      top: ctx.input.top
    });

    let builds = (result.value || []).map((b: any) => ({
      buildId: b.id,
      buildNumber: b.buildNumber,
      status: b.status,
      result: b.result,
      sourceBranch: b.sourceBranch,
      sourceVersion: b.sourceVersion,
      definitionName: b.definition?.name,
      definitionId: b.definition?.id,
      requestedBy: b.requestedBy?.displayName,
      startTime: b.startTime,
      finishTime: b.finishTime,
      url: b._links?.web?.href || b.url
    }));

    return {
      output: { builds, count: builds.length },
      message: `Found **${builds.length}** builds.`
    };
  })
  .build();
