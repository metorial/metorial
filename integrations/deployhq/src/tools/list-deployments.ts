import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, validateInteger } from '../lib/client';
import { spec } from '../spec';

let deploymentSummarySchema = z.object({
  deploymentIdentifier: z.string().describe('Unique deployment identifier'),
  status: z.string().describe('Deployment status'),
  deployer: z.string().optional().describe('Who triggered the deployment'),
  branch: z.string().optional().describe('Deployed branch'),
  endRevision: z.string().optional().describe('End revision ref'),
  queuedAt: z.string().optional().describe('When the deployment was queued'),
  startedAt: z.string().nullable().optional().describe('When the deployment started'),
  completedAt: z.string().nullable().optional().describe('When the deployment completed')
});

export let listDeployments = SlateTool.create(spec, {
  name: 'List Deployments',
  key: 'list_deployments',
  description: `List recent deployments for a DeployHQ project. Returns deployment status, deployer, branch, revision, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectPermalink: z
        .string()
        .describe('Project permalink or identifier. Call list_projects to discover projects.'),
      page: z.number().optional().describe('Page number, starting at 1'),
      perPage: z.number().optional().describe('Number of deployments per page'),
      parentIdentifier: z
        .string()
        .optional()
        .describe(
          'Filter by server or server group identifier from list_servers or list_server_groups'
        ),
      currentlyRunning: z
        .boolean()
        .optional()
        .describe('Return currently running deployments only')
    })
  )
  .output(
    z.object({
      deployments: z
        .array(deploymentSummarySchema)
        .describe('Deployments on the current page'),
      pagination: z
        .object({
          currentPage: z.number().optional(),
          totalPages: z.number().optional(),
          totalRecords: z.number().optional()
        })
        .optional()
        .describe('Provider pagination metadata'),
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email,
      accountName: ctx.config.accountName
    });

    validateInteger(ctx.input.page, 'page', 1);
    validateInteger(ctx.input.perPage, 'perPage', 1);
    let result = await client.listDeployments(ctx.input.projectPermalink, {
      page: ctx.input.page,
      per_page: ctx.input.perPage,
      to: ctx.input.parentIdentifier,
      currently_running: ctx.input.currentlyRunning ? '1' : undefined
    });
    let deployments = result.records;

    let mapped = deployments.map((d: any) => ({
      deploymentIdentifier: d.identifier,
      status: d.status,
      deployer: typeof d.deployer === 'string' ? d.deployer : undefined,
      branch: d.branch,
      endRevision: d.end_revision?.ref,
      queuedAt: d.timestamps?.queued_at ?? d.queued_at,
      startedAt:
        d.timestamps?.started_at !== undefined ? d.timestamps.started_at : d.started_at,
      completedAt:
        d.timestamps?.completed_at !== undefined ? d.timestamps.completed_at : d.completed_at
    }));

    return {
      output: {
        deployments: mapped,
        pagination: result.pagination
          ? {
              currentPage: result.pagination.current_page,
              totalPages: result.pagination.total_pages,
              totalRecords: result.pagination.total_records
            }
          : undefined,
        raw: result
      },
      message: `Found **${mapped.length}** deployment(s) on this page in project \`${ctx.input.projectPermalink}\`.`
    };
  })
  .build();
